const { getUserByToken, refreshSession } = require('./models/users');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Sesión inválida o expirada' });
    await refreshSession(token);
    req.user = user;
    req.authToken = token;
    next();
  } catch (err) {
    console.error('Error de autenticación:', err);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere permisos de administrador' });
  }
  next();
}

function actorFromReq(req) {
  return req.user?.nombre || req.user?.username || 'Sistema';
}

module.exports = { requireAuth, requireAdmin, actorFromReq };
