import express from 'express';
import { login, createUser, getUsers, User } from '../services/authService.js';

const router = express.Router();

// POST /api/auth/login - 用户登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const result = login(username, password);
    
    if (!result) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    res.json({
      token: result.token,
      user: result.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// POST /api/auth/register - 创建用户（可选，生产环境可能需要权限控制）
router.post('/register', (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: '用户名、密码和显示名称不能为空' });
    }
    
    const user = createUser(username, password, displayName);
    
    if (!user) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// GET /api/auth/users - 获取用户列表（可选，用于管理功能）
router.get('/users', (req, res) => {
  try {
    const users = getUsers();
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// GET /api/auth/verify - 验证 token（用于前端自动登录）
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  
  const token = authHeader.slice(7);
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yunxin-contract-generator-secret-key-change-in-production');
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
});

export default router;
