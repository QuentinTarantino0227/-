import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import contractRoutes from './routes/contract.js';
import excelRoutes from './routes/excel.js';
import projectRoutes from './routes/project.js';
import authRoutes from './routes/auth.js';
import { initDefaultUser } from './services/authService.js';
import { cleanupOldProjects } from './services/projectService.js';

// 每日凌晨 3:00 自动清理历史项目（保留 30 天）
const CLEANUP_HOUR = 3;
const CLEANUP_RETENTION_DAYS = 30;

function scheduleCleanup() {
  const now = new Date();
  const next3AM = new Date(now);
  next3AM.setHours(CLEANUP_HOUR, 0, 0, 0);

  // 如果今天 3:00 已过，设置为明天
  if (next3AM <= now) {
    next3AM.setDate(next3AM.getDate() + 1);
  }

  const msUntil = next3AM.getTime() - now.getTime();
  console.log(`⏰  下次自动清理历史项目：${next3AM.toLocaleString('zh-CN')}（保留最近 ${CLEANUP_RETENTION_DAYS} 天）`);

  setTimeout(() => {
    try {
      const deleted = cleanupOldProjects(CLEANUP_RETENTION_DAYS);
      console.log(`✅ 自动清理完成：删除了 ${deleted} 条旧记录`);
    } catch (err) {
      console.error('❌ 自动清理失败:', err);
    }
    // 清理后每 24 小时再调度一次
    setInterval(() => {
      try {
        const deleted = cleanupOldProjects(CLEANUP_RETENTION_DAYS);
        console.log(`✅ 自动清理完成：删除了 ${deleted} 条旧记录`);
      } catch (err) {
        console.error('❌ 自动清理失败:', err);
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntil);
}

// ES module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支持大型表单数据

// 静态文件服务（前端构建产物）
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/project', projectRoutes);

// SPA 回退：所有非 API 路由返回 index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    next();
  }
});

// 全局错误处理
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 API available at http://localhost:${PORT}/api`);
  
  // 初始化默认用户
  initDefaultUser();

  // 启动每日凌晨 3:00 自动清理
  scheduleCleanup();
});
