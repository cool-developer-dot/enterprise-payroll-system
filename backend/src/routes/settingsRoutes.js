import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { cacheMiddleware } from '../utils/cache.js';
import {
  getAllSettings,
  getSettingsByType,
  updateCompanySettings,
  updatePayrollSettings,
  updateAttendanceSettings,
  updateLeavePolicies,
  getTimezones,
} from '../controllers/settingsController.js';
import {
  validateGetSettings,
  validateCompanySettings,
  validatePayrollSettings,
  validateAttendanceSettings,
  validateLeavePolicies,
  handleValidationErrors,
} from '../validators/settingsValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get timezones (available to all authenticated users)
router.get('/timezones', getTimezones);

// Admin/Manager-only routes (with caching)
router.get(
  '/',
  authorize('admin', 'manager'),
  cacheMiddleware(300), // Cache for 5 minutes
  getAllSettings
);

router.get(
  '/:type',
  authorize('admin', 'manager'),
  validateGetSettings,
  handleValidationErrors,
  cacheMiddleware(300), // Cache for 5 minutes
  getSettingsByType
);

router.put(
  '/company',
  authorize('admin', 'manager'),
  validateCompanySettings,
  handleValidationErrors,
  updateCompanySettings
);

router.put(
  '/payroll',
  authorize('admin', 'manager'),
  validatePayrollSettings,
  handleValidationErrors,
  updatePayrollSettings
);

router.put(
  '/attendance',
  authorize('admin', 'manager'),
  validateAttendanceSettings,
  handleValidationErrors,
  updateAttendanceSettings
);

router.put(
  '/leave-policies',
  authorize('admin', 'manager'),
  validateLeavePolicies,
  handleValidationErrors,
  updateLeavePolicies
);

export default router;

