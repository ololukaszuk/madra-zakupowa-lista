const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
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
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION) || 86400;

// Middleware do weryfikacji tokenu
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

// Middleware do sprawdzania roli
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Brak uprawnień' });
  }
  next();
};

// Rejestracja
app.post('/api/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, name } = req.body;
  
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email już istnieje' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, is_approved',
      [email, passwordHash, name]
    );

    res.status(201).json({ 
      message: 'Konto utworzone. Oczekuje na zatwierdzenie przez administratora.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Logowanie
app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Nieprawidłowe dane logowania' });
    }

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Konto oczekuje na zatwierdzenie' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Weryfikacja tokenu
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Profil użytkownika
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_approved, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Lista użytkowników (admin)
app.get('/api/auth/users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_approved, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Oczekujący na zatwierdzenie (admin/manager)
app.get('/api/auth/users/pending', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE is_approved = FALSE ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zatwierdzenie użytkownika (admin/manager)
app.put('/api/auth/users/:id/approve', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, name, role, is_approved',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zmiana roli użytkownika (admin)
app.put('/api/auth/users/:id/role', verifyToken, requireRole('admin'), [
  body('role').isIn(['admin', 'manager', 'user'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role, is_approved',
      [req.body.role, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Usunięcie użytkownika (admin)
app.delete('/api/auth/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Użytkownik usunięty' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Grupy
app.post('/api/auth/groups', verifyToken, [
  body('name').trim().isLength({ min: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );
    
    // Dodaj twórcę jako właściciela grupy
    await pool.query(
      'INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3)',
      [req.user.id, result.rows[0].id, 'owner']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/auth/groups', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, ug.role as user_role 
      FROM groups g
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE ug.user_id = $1
      ORDER BY g.name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/api/auth/groups/:id/members', verifyToken, [
  body('userId').isUUID(),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Sprawdź czy użytkownik ma uprawnienia
    const access = await pool.query(
      'SELECT role FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [req.user.id, req.params.id]
    );
    if (access.rows.length === 0 || !['owner', 'admin'].includes(access.rows[0].role)) {
      return res.status(403).json({ error: 'Brak uprawnień' });
    }

    await pool.query(
      'INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.body.userId, req.params.id, req.body.role || 'member']
    );

    res.json({ message: 'Dodano do grupy' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/auth/groups/:id/members', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.name, ug.role, ug.joined_at
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = $1
      ORDER BY ug.role, u.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.SERVICE_PORT || 8081;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
