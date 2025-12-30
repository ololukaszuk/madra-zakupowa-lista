const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 1000,
  message: { error: 'Za dużo żądań, spróbuj później' }
});
app.use(limiter);

// Services URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const SHOPPING_SERVICE_URL = process.env.SHOPPING_SERVICE_URL;
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL;
const SUGGESTION_SERVICE_URL = process.env.SUGGESTION_SERVICE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// Proxy options factory
const createProxy = (target, pathRewrite = {}) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite,
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Service unavailable' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', services: {
  auth: AUTH_SERVICE_URL,
  shopping: SHOPPING_SERVICE_URL,
  analytics: ANALYTICS_SERVICE_URL,
  suggestions: SUGGESTION_SERVICE_URL
}}));

// Auth routes (public)
app.use('/api/auth', createProxy(AUTH_SERVICE_URL));

// Token validation middleware for protected routes
const validateToken = (req, res, next) => {
  // Skip validation for public routes
  if (req.path.startsWith('/api/auth/login') || 
      req.path.startsWith('/api/auth/register') ||
      req.path === '/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokenu autoryzacji' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Nieprawidłowy token' });
  }
};

// Protected routes
app.use('/api/profiles', validateToken, createProxy(SHOPPING_SERVICE_URL));
app.use('/api/lists', validateToken, createProxy(SHOPPING_SERVICE_URL));
app.use('/api/items', validateToken, createProxy(SHOPPING_SERVICE_URL));
app.use('/api/analytics', validateToken, createProxy(ANALYTICS_SERVICE_URL));
app.use('/api/suggestions', validateToken, createProxy(SUGGESTION_SERVICE_URL));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint nie znaleziony' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Błąd serwera' });
});

const PORT = process.env.SERVICE_PORT || 8080;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
