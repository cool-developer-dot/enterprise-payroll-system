import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentEmployees,
} from '../controllers/departmentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentId,
  validateDepartmentQuery,
  handleValidationErrors,
} from '../validators/departmentValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Public routes (authenticated users can view)
router.get('/', validateDepartmentQuery, handleValidationErrors, getDepartments);
router.get('/:id', validateDepartmentId, handleValidationErrors, getDepartmentById);
router.get('/:id/employees', validateDepartmentId, handleValidationErrors, getDepartmentEmployees);

// Admin/Manager-only routes
router.post('/', authorize('admin', 'manager'), validateCreateDepartment, handleValidationErrors, createDepartment);
router.put('/:id', authorize('admin', 'manager'), validateUpdateDepartment, handleValidationErrors, updateDepartment);
router.delete('/:id', authorize('admin', 'manager'), validateDepartmentId, handleValidationErrors, deleteDepartment);

export default router;

