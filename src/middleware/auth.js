import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const secret = process.env.JWT_SECRET || 'dev-insecure-secret';
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.sub };
    return next();
  } catch (_e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}


