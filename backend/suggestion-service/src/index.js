const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { Client } = require('@elastic/elasticsearch');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const esClient = new Client({
  node: `http://${process.env.ELASTICSEARCH_HOST}:${process.env.ELASTICSEARCH_PORT}`
});

const JWT_SECRET = process.env.JWT_SECRET;
const ES_INDEX = 'products';

// Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Brak tokenu' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Nieprawidłowy token' });
  }
};

// Sprawdzanie dostępu do profilu
const checkProfileAccess = async (profileId, userId) => {
  const result = await pool.query(`
    SELECT sp.* FROM shopping_profiles sp
    LEFT JOIN user_groups ug ON sp.group_id = ug.group_id
    WHERE sp.id = $1 AND (sp.owner_id = $2 OR ug.user_id = $2)
  `, [profileId, userId]);
  return result.rows.length > 0;
};

// Inicjalizacja indeksu Elasticsearch
async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        body: {
          settings: {
            analysis: {
              analyzer: {
                polish_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'polish_stem']
                }
              },
              filter: {
                polish_stem: {
                  type: 'stemmer',
                  language: 'polish'
                }
              }
            }
          },
          mappings: {
            properties: {
              name: { 
                type: 'text',
                analyzer: 'polish_analyzer',
                fields: {
                  suggest: {
                    type: 'completion',
                    analyzer: 'simple'
                  },
                  raw: { type: 'keyword' }
                }
              },
              category: { type: 'keyword' },
              default_unit: { type: 'keyword' },
              usage_count: { type: 'integer' }
            }
          }
        }
      });
      console.log('Elasticsearch index created');
      await syncProductsToES();
    }
  } catch (err) {
    console.error('Elasticsearch init error:', err);
  }
}

// Synchronizacja produktów do ES
async function syncProductsToES() {
  try {
    const products = await pool.query('SELECT * FROM products');
    for (const product of products.rows) {
      await esClient.index({
        index: ES_INDEX,
        id: product.id,
        body: {
          name: product.name,
          category: product.category,
          default_unit: product.default_unit,
          usage_count: product.usage_count
        }
      });
    }
    await esClient.indices.refresh({ index: ES_INDEX });
    console.log(`Synced ${products.rows.length} products to Elasticsearch`);
  } catch (err) {
    console.error('ES sync error:', err);
  }
}

// Podpowiedzi produktów (fuzzy matching)
app.get('/api/suggestions/products', verifyToken, async (req, res) => {
  const { q, limit = 10 } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    // Próbuj najpierw Elasticsearch
    let suggestions = [];
    
    try {
      const esResult = await esClient.search({
        index: ES_INDEX,
        body: {
          size: parseInt(limit),
          query: {
            bool: {
              should: [
                {
                  match: {
                    name: {
                      query: q,
                      fuzziness: 'AUTO',
                      boost: 2
                    }
                  }
                },
                {
                  prefix: {
                    'name.raw': {
                      value: q.toLowerCase(),
                      boost: 3
                    }
                  }
                },
                {
                  match_phrase_prefix: {
                    name: {
                      query: q,
                      boost: 1.5
                    }
                  }
                }
              ]
            }
          },
          sort: [
            { _score: 'desc' },
            { usage_count: 'desc' }
          ]
        }
      });

      suggestions = esResult.hits.hits.map(hit => ({
        id: hit._id,
        name: hit._source.name,
        category: hit._source.category,
        defaultUnit: hit._source.default_unit,
        score: hit._score
      }));
    } catch (esErr) {
      console.log('ES search failed, falling back to PostgreSQL:', esErr.message);
    }

    // Fallback do PostgreSQL z trigram
    if (suggestions.length === 0) {
      const pgResult = await pool.query(`
        SELECT id, name, category, default_unit,
          similarity(name, $1) as sim,
          name ILIKE $2 as starts_with
        FROM products
        WHERE similarity(name, $1) > 0.2 OR name ILIKE $2
        ORDER BY starts_with DESC, sim DESC, usage_count DESC
        LIMIT $3
      `, [q, `${q}%`, limit]);

      suggestions = pgResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        defaultUnit: row.default_unit,
        score: row.sim
      }));
    }

    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Sugestie na podstawie historii profilu
app.get('/api/suggestions/profile/:profileId/items', verifyToken, async (req, res) => {
  const { q, limit = 10 } = req.query;

  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    let query = `
      SELECT product_name as name, 
        COUNT(*) as times_bought,
        ROUND(AVG(quantity)::numeric, 2) as avg_quantity,
        mode() WITHIN GROUP (ORDER BY unit) as common_unit
      FROM item_history
      WHERE profile_id = $1
    `;
    const params = [req.params.profileId];

    if (q && q.length >= 2) {
      query += ` AND (similarity(product_name, $2) > 0.2 OR product_name ILIKE $3)`;
      params.push(q, `${q}%`);
    }

    query += `
      GROUP BY product_name
      ORDER BY times_bought DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json(result.rows.map(row => ({
      name: row.name,
      timesBought: parseInt(row.times_bought),
      suggestedQuantity: parseFloat(row.avg_quantity),
      suggestedUnit: row.common_unit
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Sugestie całych list na podstawie wzorców
app.get('/api/suggestions/profile/:profileId/lists', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    // Pobierz produkty najczęściej kupowane razem
    const frequentItems = await pool.query(`
      SELECT product_name, COUNT(*) as count,
        ROUND(AVG(quantity)::numeric, 2) as avg_qty,
        mode() WITHIN GROUP (ORDER BY unit) as unit
      FROM item_history
      WHERE profile_id = $1
      GROUP BY product_name
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT 15
    `, [req.params.profileId]);

    // Pobierz zapisane szablony
    const templates = await pool.query(`
      SELECT * FROM list_templates
      WHERE profile_id = $1
      ORDER BY usage_count DESC
      LIMIT 5
    `, [req.params.profileId]);

    // Generuj sugestię "typowych zakupów"
    const suggestedList = frequentItems.rows.map(item => ({
      name: item.product_name,
      quantity: parseFloat(item.avg_qty),
      unit: item.unit
    }));

    res.json({
      suggestedItems: suggestedList,
      templates: templates.rows.map(t => ({
        id: t.id,
        name: t.name,
        items: t.items,
        usageCount: t.usage_count
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zapisz szablon listy
app.post('/api/suggestions/profile/:profileId/templates', verifyToken, async (req, res) => {
  const { name, items } = req.body;

  if (!name || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Podaj nazwę i elementy szablonu' });
  }

  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const result = await pool.query(`
      INSERT INTO list_templates (profile_id, name, items)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.params.profileId, name, JSON.stringify(items)]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Użyj szablonu
app.post('/api/suggestions/templates/:id/use', verifyToken, async (req, res) => {
  try {
    const template = await pool.query('SELECT * FROM list_templates WHERE id = $1', [req.params.id]);
    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Szablon nie znaleziony' });
    }

    const hasAccess = await checkProfileAccess(template.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    // Zwiększ licznik użyć
    await pool.query(
      'UPDATE list_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [req.params.id]
    );

    res.json({
      items: template.rows[0].items,
      name: template.rows[0].name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Sugerowana ilość dla produktu
app.get('/api/suggestions/profile/:profileId/quantity/:productName', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const result = await pool.query(`
      SELECT 
        ROUND(AVG(quantity)::numeric, 2) as avg_quantity,
        MIN(quantity) as min_quantity,
        MAX(quantity) as max_quantity,
        mode() WITHIN GROUP (ORDER BY unit) as common_unit,
        COUNT(*) as times_bought
      FROM item_history
      WHERE profile_id = $1 AND LOWER(product_name) = LOWER($2)
    `, [req.params.profileId, req.params.productName]);

    if (!result.rows[0].times_bought || result.rows[0].times_bought === '0') {
      // Sprawdź w globalnych produktach
      const globalResult = await pool.query(
        'SELECT default_unit FROM products WHERE LOWER(name) = LOWER($1)',
        [req.params.productName]
      );
      
      return res.json({
        suggestedQuantity: 1,
        unit: globalResult.rows[0]?.default_unit || 'szt',
        basedOnHistory: false
      });
    }

    res.json({
      suggestedQuantity: parseFloat(result.rows[0].avg_quantity),
      minQuantity: parseFloat(result.rows[0].min_quantity),
      maxQuantity: parseFloat(result.rows[0].max_quantity),
      unit: result.rows[0].common_unit,
      timesBought: parseInt(result.rows[0].times_bought),
      basedOnHistory: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dodaj produkt do katalogu
app.post('/api/suggestions/products', verifyToken, async (req, res) => {
  const { name, category, defaultUnit } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nazwa produktu jest wymagana' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO products (name, category, default_unit)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO UPDATE SET
        category = COALESCE(EXCLUDED.category, products.category),
        default_unit = COALESCE(EXCLUDED.default_unit, products.default_unit)
      RETURNING *
    `, [name.toLowerCase(), category, defaultUnit]);

    // Sync do ES
    try {
      await esClient.index({
        index: ES_INDEX,
        id: result.rows[0].id,
        body: {
          name: result.rows[0].name,
          category: result.rows[0].category,
          default_unit: result.rows[0].default_unit,
          usage_count: result.rows[0].usage_count
        }
      });
    } catch (esErr) {
      console.log('ES index failed:', esErr.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
const PORT = process.env.SERVICE_PORT || 8084;

initElasticsearch().then(() => {
  app.listen(PORT, () => console.log(`Suggestion service running on port ${PORT}`));
});
