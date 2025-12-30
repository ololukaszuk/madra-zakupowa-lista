const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fetch = require('node-fetch');

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

const JWT_SECRET = process.env.JWT_SECRET;
const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_WEBSEARCH_URL = process.env.OLLAMA_WEBSEARCH_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

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

// Wywołanie Ollama
async function callOllama(prompt, useWebSearch = false) {
  const url = useWebSearch ? OLLAMA_WEBSEARCH_URL : OLLAMA_URL;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false
      })
    });
    
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    
    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('Ollama error:', err);
    return null;
  }
}

// Statystyki profilu
app.get('/api/analytics/profile/:profileId/stats', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    // Podstawowe statystyki
    const stats = await pool.query(`
      SELECT 
        COUNT(DISTINCT sl.id) as total_lists,
        COUNT(DISTINCT sl.id) FILTER (WHERE sl.status = 'completed') as completed_lists,
        COUNT(ih.id) as total_items_purchased
      FROM shopping_lists sl
      LEFT JOIN item_history ih ON sl.profile_id = ih.profile_id
      WHERE sl.profile_id = $1
    `, [req.params.profileId]);

    // Najczęściej kupowane produkty
    const topProducts = await pool.query(`
      SELECT product_name, COUNT(*) as count, 
        ROUND(AVG(quantity)::numeric, 2) as avg_quantity,
        mode() WITHIN GROUP (ORDER BY unit) as common_unit
      FROM item_history
      WHERE profile_id = $1
      GROUP BY product_name
      ORDER BY count DESC
      LIMIT 20
    `, [req.params.profileId]);

    // Trendy czasowe (ostatnie 30 dni)
    const trends = await pool.query(`
      SELECT DATE(purchased_at) as date, COUNT(*) as items
      FROM item_history
      WHERE profile_id = $1 AND purchased_at > CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(purchased_at)
      ORDER BY date
    `, [req.params.profileId]);

    res.json({
      ...stats.rows[0],
      topProducts: topProducts.rows,
      trends: trends.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Analiza AI
app.get('/api/analytics/profile/:profileId/ai-insights', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    // Pobierz dane do analizy
    const history = await pool.query(`
      SELECT product_name, quantity, unit, purchased_at
      FROM item_history
      WHERE profile_id = $1
      ORDER BY purchased_at DESC
      LIMIT 200
    `, [req.params.profileId]);

    if (history.rows.length < 5) {
      return res.json({ 
        insights: 'Za mało danych do analizy. Dokończ kilka list zakupowych, aby otrzymać rekomendacje.' 
      });
    }

    // Przygotuj dane dla AI
    const productSummary = {};
    history.rows.forEach(item => {
      if (!productSummary[item.product_name]) {
        productSummary[item.product_name] = { count: 0, quantities: [] };
      }
      productSummary[item.product_name].count++;
      productSummary[item.product_name].quantities.push(item.quantity);
    });

    const summaryText = Object.entries(productSummary)
      .map(([name, data]) => `${name}: kupiono ${data.count} razy, średnio ${(data.quantities.reduce((a,b)=>a+b,0)/data.quantities.length).toFixed(1)} szt`)
      .join('\n');

    const prompt = `Jesteś asystentem zakupowym. Na podstawie poniższej historii zakupów, przygotuj krótką analizę po polsku:
1. Jakie produkty są kupowane najczęściej
2. Czy widzisz jakieś wzorce zakupowe
3. Podaj 2-3 praktyczne sugestie optymalizacji zakupów

Historia zakupów:
${summaryText}

Odpowiedz zwięźle, maksymalnie 200 słów.`;

    const aiResponse = await callOllama(prompt);

    res.json({ 
      insights: aiResponse || 'Nie udało się uzyskać analizy AI. Spróbuj ponownie później.',
      dataPoints: history.rows.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Porównanie cen (z web search)
app.post('/api/analytics/price-check', verifyToken, async (req, res) => {
  const { products } = req.body;
  
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Podaj listę produktów' });
  }

  try {
    const prompt = `Wyszukaj aktualne ceny w polskich sklepach dla następujących produktów: ${products.join(', ')}. 
Podaj krótkie podsumowanie gdzie można kupić najtaniej po polsku.`;

    const aiResponse = await callOllama(prompt, true);

    res.json({ 
      priceInfo: aiResponse || 'Nie udało się sprawdzić cen. Spróbuj ponownie później.',
      products: products
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Przepisy na podstawie listy
app.post('/api/analytics/recipe-suggestions', verifyToken, async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Podaj listę produktów' });
  }

  try {
    const prompt = `Na podstawie tych produktów: ${items.join(', ')}, zaproponuj po polsku 2-3 proste przepisy które można z nich przygotować. Odpowiedz krótko i konkretnie.`;

    const aiResponse = await callOllama(prompt);

    res.json({ 
      recipes: aiResponse || 'Nie udało się wygenerować przepisów. Spróbuj ponownie później.',
      basedOn: items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Wzorce zakupowe
app.get('/api/analytics/profile/:profileId/patterns', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    // Produkty często kupowane razem
    const cooccurrence = await pool.query(`
      WITH list_items AS (
        SELECT sl.id as list_id, si.name
        FROM shopping_lists sl
        JOIN shopping_items si ON sl.id = si.list_id
        WHERE sl.profile_id = $1 AND sl.status = 'completed'
      )
      SELECT a.name as product1, b.name as product2, COUNT(*) as times_together
      FROM list_items a
      JOIN list_items b ON a.list_id = b.list_id AND a.name < b.name
      GROUP BY a.name, b.name
      HAVING COUNT(*) >= 2
      ORDER BY times_together DESC
      LIMIT 20
    `, [req.params.profileId]);

    // Częstotliwość zakupów wg dnia tygodnia
    const dayOfWeek = await pool.query(`
      SELECT EXTRACT(DOW FROM purchased_at) as day, COUNT(*) as count
      FROM item_history
      WHERE profile_id = $1
      GROUP BY EXTRACT(DOW FROM purchased_at)
      ORDER BY day
    `, [req.params.profileId]);

    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

    res.json({
      frequentlyBoughtTogether: cooccurrence.rows,
      purchasesByDay: dayOfWeek.rows.map(d => ({
        day: dayNames[d.day],
        count: parseInt(d.count)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.SERVICE_PORT || 8083;
app.listen(PORT, () => console.log(`Analytics service running on port ${PORT}`));
