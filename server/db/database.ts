import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'projects.db');

// 确保 data 目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 初始化用户表（包含 role 和 affiliation）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'marketing',
    affiliation TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )
`);

// 初始化项目表（添加 user_id 字段）
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY,
    user_id INTEGER,
    created_at TEXT NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    last_saved TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// 为现有 users 表添加 role 和 affiliation 列（如果不存在）
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'marketing'`);
} catch (e) {
  // 列已存在，忽略错误
}
try {
  db.exec(`ALTER TABLE users ADD COLUMN affiliation TEXT NOT NULL DEFAULT ''`);
} catch (e) {
  // 列已存在，忽略错误
}

// 为现有 projects 表添加 user_id 列（如果不存在）
try {
  db.exec(`ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id)`);
} catch (e) {
  // 列已存在，忽略错误
}

// 为 projects 表添加 pinned 列（置顶标记，0=未置顶，1=已置顶）
try {
  db.exec(`ALTER TABLE projects ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`);
} catch (e) {
  // 列已存在，忽略错误
}

export default db;
