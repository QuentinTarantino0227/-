import { Router } from 'express';
import * as projectService from '../services/projectService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// 所有项目路由需要认证
router.use(authenticateToken);

// POST /api/project/save
router.post('/save', (req, res) => {
  try {
    const { formState } = req.body;
    if (!formState) {
      return res.status(400).json({ error: 'Missing formState' });
    }
    
    const userId = req.user!.id;
    const projectId = projectService.saveProject(formState, userId);
    res.json({ projectId });
  } catch (err) {
    console.error('Save project error:', err);
    res.status(500).json({ error: 'Failed to save project' });
  }
});

// GET /api/project/list - 返回当前用户的项目列表
router.get('/list', (req, res) => {
  try {
    const userId = req.user!.id;
    const projects = projectService.listProjects(userId);
    res.json(projects);
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/project/:id
router.get('/:id', (req, res) => {
  try {
    const userId = req.user!.id;
    const project = projectService.getProject(req.params.id, userId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// DELETE /api/project/:id
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user!.id;
    const success = projectService.deleteProject(req.params.id, userId);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/project/pin - 切换项目置顶状态
router.post('/pin', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }
    
    const userId = req.user!.id;
    const success = projectService.togglePin(projectId, userId);
    if (!success) {
      return res.status(400).json({ error: '置顶数量已达上限（最多5条）' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle pin error:', err);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// POST /api/project/duplicate
router.post('/duplicate', (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }
    
    const userId = req.user!.id;
    const newState = projectService.duplicateProject(projectId, userId);
    if (!newState) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(newState);
  } catch (err) {
    console.error('Duplicate project error:', err);
    res.status(500).json({ error: 'Failed to duplicate project' });
  }
});

export default router;
