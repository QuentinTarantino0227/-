import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'yunxin-contract-generator-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: string;
  affiliation: string;
  created_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

// 密码加密
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// 密码比对
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// 生成 JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      affiliation: user.affiliation
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 验证 JWT token
export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      display_name: decoded.display_name,
      role: decoded.role,
      affiliation: decoded.affiliation,
      created_at: ''
    };
  } catch (e) {
    return null;
  }
}

// 用户登录
export function login(username: string, password: string): { token: string; user: User } | null {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username) as UserWithPassword | undefined;
  
  if (!user || !comparePassword(password, user.password_hash)) {
    return null;
  }
  
  const token = generateToken({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    affiliation: user.affiliation,
    created_at: user.created_at
  });
  
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      affiliation: user.affiliation,
      created_at: user.created_at
    }
  };
}

// 创建用户
export function createUser(username: string, password: string, displayName: string, role: string = 'marketing', affiliation: string = ''): User | null {
  try {
    const stmt = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role, affiliation, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(username, hashPassword(password), displayName, role, affiliation, new Date().toISOString());
    
    return {
      id: result.lastInsertRowid as number,
      username,
      display_name: displayName,
      role,
      affiliation,
      created_at: new Date().toISOString()
    };
  } catch (e) {
    // 用户名已存在
    return null;
  }
}

// 获取用户列表
export function getUsers(): User[] {
  const stmt = db.prepare('SELECT id, username, display_name, role, affiliation, created_at FROM users');
  return stmt.all() as User[];
}

// 初始化默认用户（如果没有任何用户）
export function initDefaultUser() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count.count === 0) {
    // 从参考项目导入用户数据
    const defaultUsers = [
      { username: 'fupeng', password: '123456', displayName: '付鹏', role: 'auditor', affiliation: '金融服务部' },
      { username: 'yuanxiaonan', password: '123456', displayName: '袁小楠', role: 'risk_auditor', affiliation: '风控部' },
      { username: 'yangxiaowei', password: '123456', displayName: '杨小伟', role: 'market_auditor', affiliation: '市场部' },
      { username: 'liyu', password: '123456', displayName: '李宇', role: 'marketing', affiliation: '华东区' },
      { username: 'jiangyong', password: '123456', displayName: '蒋勇', role: 'marketing', affiliation: '华南区' },
      { username: 'wangyongnan', password: '123456', displayName: '王永南', role: 'marketing', affiliation: '华北区' },
      { username: 'zhangxinxin', password: '123456', displayName: '张鑫鑫', role: 'marketing', affiliation: '华中区' },
      { username: 'fujing', password: '123456', displayName: '付静', role: 'legal_auditor', affiliation: '法务部' },
      { username: 'ganquan', password: '123456', displayName: '甘泉', role: 'marketing', affiliation: '北京区' },
      { username: 'pangbo', password: '123456', displayName: '庞博', role: 'market_auditor', affiliation: '市场部' },
    ];
    
    defaultUsers.forEach(u => {
      createUser(u.username, u.password, u.displayName, u.role, u.affiliation);
    });
    
    console.log(`✅ 已导入 ${defaultUsers.length} 个用户`);
  }
}
