import { Request, Response, NextFunction } from 'express';
import { verifyToken, User } from '../services/authService.js';

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// 认证中间件 - 验证 JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  const user = verifyToken(token);
  
  if (!user) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  req.user = user;
  next();
}

// 角色检查中间件
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未登录' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    
    next();
  };
}

// 可选认证中间件 - 如果提供了 token 则验证，否则继续
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  
  next();
}
