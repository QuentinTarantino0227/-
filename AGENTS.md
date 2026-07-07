# 项目说明

## 合同模板维护

当用户更新了 `.docx` 合同模板文件时，**必须**运行 run 拆分修复脚本：

```bash
# 修复单个模板
npm run fix:template -- <模板文件路径>

# 修复所有模板
npm run fix:templates
```

Word 编辑过程中会将 `{{variable}}` 拆分成多个 XML run，导致变量无法替换。脚本会自动合并这些拆分。

**修复后需要同步两个目录：**
- `server/templates/comm_yunxin/` — 服务器运行时使用
- `public/ContractForm/comm_yunxin/` — 前端下载使用

## 开发服务器

```bash
# 前端
npm run dev

# 后端
npm run server:dev
```
