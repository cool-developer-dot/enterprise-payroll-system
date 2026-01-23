import express from 'express';
import {
  listProjects,
  getProject,
  createProjectEndpoint,
  updateProjectEndpoint,
  deleteProjectEndpoint,
  getProjectInsights,
  getAggregatedInsights,
  testProjectConnection,
  syncProject,
} from '../controllers/projectController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  validateProjectId,
  validateCreateProject,
  validateUpdateProject,
  validateConnectionTest,
  validateListProjects,
  handleValidationErrors,
} from '../validators/projectValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/projects - List projects
 * Access: All authenticated users
 */
router.get(
  '/',
  validateListProjects,
  handleValidationErrors,
  listProjects
);

/**
 * GET /api/projects/insights/aggregated - Get aggregated insights
 * Access: All authenticated users
 */
router.get(
  '/insights/aggregated',
  getAggregatedInsights
);

/**
 * GET /api/projects/:id - Get project details
 * Access: All authenticated users
 */
router.get(
  '/:id',
  validateProjectId,
  handleValidationErrors,
  getProject
);

/**
 * GET /api/projects/:id/insights - Get project insights
 * Access: All authenticated users
 */
router.get(
  '/:id/insights',
  validateProjectId,
  handleValidationErrors,
  getProjectInsights
);

/**
 * POST /api/projects - Create project
 * Access: Admin and Manager
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  validateCreateProject,
  handleValidationErrors,
  createProjectEndpoint
);

/**
 * PUT /api/projects/:id - Update project
 * Access: Admin and Manager
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  validateUpdateProject,
  handleValidationErrors,
  updateProjectEndpoint
);

/**
 * DELETE /api/projects/:id - Delete project
 * Access: Admin and Manager
 */
router.delete(
  '/:id',
  authorize(['admin', 'manager']),
  validateProjectId,
  handleValidationErrors,
  deleteProjectEndpoint
);

/**
 * POST /api/projects/:id/connect - Test connection
 * Access: Admin and Manager
 */
router.post(
  '/:id/connect',
  authorize(['admin', 'manager']),
  validateProjectId,
  validateConnectionTest,
  handleValidationErrors,
  testProjectConnection
);

/**
 * POST /api/projects/:id/sync - Sync project data
 * Access: Admin and Manager
 */
router.post(
  '/:id/sync',
  authorize(['admin', 'manager']),
  validateProjectId,
  handleValidationErrors,
  syncProject
);

export default router;

