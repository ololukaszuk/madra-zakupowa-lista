const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');

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

// === PROFILE ===
app.post('/api/profiles', verifyToken, [
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, groupId, isShared } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO shopping_profiles (name, description, owner_id, group_id, is_shared) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, req.user.id, groupId, isShared || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/profiles', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT sp.* FROM shopping_profiles sp
      LEFT JOIN user_groups ug ON sp.group_id = ug.group_id
      WHERE sp.owner_id = $1 OR ug.user_id = $1
      ORDER BY sp.name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/profiles/:id', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const result = await pool.query('SELECT * FROM shopping_profiles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/api/profiles/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM shopping_profiles WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Nie znaleziono lub brak uprawnień' });
    res.json({ message: 'Profil usunięty' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// === LISTY ===
app.post('/api/profiles/:profileId/lists', verifyToken, [
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const result = await pool.query(
      `INSERT INTO shopping_lists (profile_id, name, created_by) 
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.profileId, req.body.name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/profiles/:profileId/lists', verifyToken, async (req, res) => {
  try {
    const hasAccess = await checkProfileAccess(req.params.profileId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const status = req.query.status || 'active';
    const result = await pool.query(`
      SELECT sl.*, 
        COUNT(si.id) as total_items,
        COUNT(si.id) FILTER (WHERE si.is_checked = true) as checked_items
      FROM shopping_lists sl
      LEFT JOIN shopping_items si ON sl.id = si.list_id
      WHERE sl.profile_id = $1 AND sl.status = $2
      GROUP BY sl.id
      ORDER BY sl.created_at DESC
    `, [req.params.profileId, status]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/lists/:id', verifyToken, async (req, res) => {
  try {
    const list = await pool.query(`
      SELECT sl.*, sp.owner_id, sp.group_id FROM shopping_lists sl
      JOIN shopping_profiles sp ON sl.profile_id = sp.id
      WHERE sl.id = $1
    `, [req.params.id]);
    
    if (list.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(list.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const items = await pool.query(`
      SELECT * FROM shopping_items WHERE list_id = $1 ORDER BY position, created_at
    `, [req.params.id]);

    res.json({ ...list.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/api/lists/:id', verifyToken, async (req, res) => {
  const { name, status } = req.body;
  
  try {
    const list = await pool.query('SELECT profile_id FROM shopping_lists WHERE id = $1', [req.params.id]);
    if (list.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(list.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const updates = [];
    const values = [];
    let idx = 1;
    
    if (name) { updates.push(`name = $${idx++}`); values.push(name); }
    if (status) { 
      updates.push(`status = $${idx++}`); 
      values.push(status);
      if (status === 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }
    
    values.push(req.params.id);
    
    const result = await pool.query(
      `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    // Jeśli lista ukończona, zapisz historię
    if (status === 'completed') {
      const items = await pool.query('SELECT * FROM shopping_items WHERE list_id = $1 AND is_checked = true', [req.params.id]);
      for (const item of items.rows) {
        await pool.query(
          'INSERT INTO item_history (profile_id, product_name, quantity, unit) VALUES ($1, $2, $3, $4)',
          [list.rows[0].profile_id, item.name, item.quantity, item.unit]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/api/lists/:id', verifyToken, async (req, res) => {
  try {
    const list = await pool.query('SELECT profile_id FROM shopping_lists WHERE id = $1', [req.params.id]);
    if (list.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(list.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    await pool.query('DELETE FROM shopping_lists WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lista usunięta' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// === ELEMENTY LISTY ===
app.post('/api/lists/:listId/items', verifyToken, [
  body('name').trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const list = await pool.query('SELECT profile_id FROM shopping_lists WHERE id = $1', [req.params.listId]);
    if (list.rows.length === 0) return res.status(404).json({ error: 'Lista nie znaleziona' });
    
    const hasAccess = await checkProfileAccess(list.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const { name, quantity, unit } = req.body;
    
    // Pobierz max position
    const maxPos = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM shopping_items WHERE list_id = $1',
      [req.params.listId]
    );

    const result = await pool.query(
      `INSERT INTO shopping_items (list_id, name, quantity, unit, position) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.listId, name, quantity || 1, unit, maxPos.rows[0].next_pos]
    );

    // Aktualizuj licznik produktu
    await pool.query(`
      INSERT INTO products (name, default_unit, usage_count) VALUES ($1, $2, 1)
      ON CONFLICT (name) DO UPDATE SET usage_count = products.usage_count + 1
    `, [name.toLowerCase(), unit]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.put('/api/items/:id', verifyToken, async (req, res) => {
  try {
    const item = await pool.query(`
      SELECT si.*, sl.profile_id FROM shopping_items si
      JOIN shopping_lists sl ON si.list_id = sl.id
      WHERE si.id = $1
    `, [req.params.id]);
    
    if (item.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(item.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    const { name, quantity, unit, isChecked, position } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (quantity !== undefined) { updates.push(`quantity = $${idx++}`); values.push(quantity); }
    if (unit !== undefined) { updates.push(`unit = $${idx++}`); values.push(unit); }
    if (position !== undefined) { updates.push(`position = $${idx++}`); values.push(position); }
    if (isChecked !== undefined) { 
      updates.push(`is_checked = $${idx++}`); 
      values.push(isChecked);
      if (isChecked) {
        updates.push(`checked_at = CURRENT_TIMESTAMP`);
        updates.push(`checked_by = $${idx++}`);
        values.push(req.user.id);
      } else {
        updates.push(`checked_at = NULL`);
        updates.push(`checked_by = NULL`);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Brak danych do aktualizacji' });

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE shopping_items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.delete('/api/items/:id', verifyToken, async (req, res) => {
  try {
    const item = await pool.query(`
      SELECT si.*, sl.profile_id FROM shopping_items si
      JOIN shopping_lists sl ON si.list_id = sl.id
      WHERE si.id = $1
    `, [req.params.id]);
    
    if (item.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(item.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    await pool.query('DELETE FROM shopping_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Element usunięty' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zmiana kolejności elementów
app.put('/api/lists/:listId/reorder', verifyToken, async (req, res) => {
  const { items } = req.body; // [{id, position}]
  
  try {
    const list = await pool.query('SELECT profile_id FROM shopping_lists WHERE id = $1', [req.params.listId]);
    if (list.rows.length === 0) return res.status(404).json({ error: 'Nie znaleziono' });
    
    const hasAccess = await checkProfileAccess(list.rows[0].profile_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Brak dostępu' });

    for (const item of items) {
      await pool.query('UPDATE shopping_items SET position = $1 WHERE id = $2', [item.position, item.id]);
    }

    res.json({ message: 'Kolejność zaktualizowana' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.SERVICE_PORT || 8082;
app.listen(PORT, () => console.log(`Shopping service running on port ${PORT}`));
