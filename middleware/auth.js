import { verifyAccessToken } from '../utils/tokens.js';

export function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.id;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
}
