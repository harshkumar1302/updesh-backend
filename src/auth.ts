import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { User } from '@updesh/shared-types';
import { db, type DbUser } from './store.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'updesh-dev-secret-change-in-production';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

export function issueTokens(userId: string) {
  return {
    accessToken: jwt.sign({ sub: userId, kind: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TTL }),
    refreshToken: jwt.sign({ sub: userId, kind: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TTL }),
  };
}

export function verifyToken(token: string, kind: 'access' | 'refresh'): DbUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; kind: string };
    if (payload.kind !== kind) return null;
    return db.users.find((u) => u.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

export function toPublicUser(u: DbUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    preferredLocalities: u.preferredLocalities,
    createdAt: u.createdAt,
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: DbUser;
  }
}

function userFromRequest(req: Request): DbUser | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return verifyToken(header.slice(7), 'access');
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = userFromRequest(req) ?? undefined;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = userFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user!.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      next();
    });
  };
}
