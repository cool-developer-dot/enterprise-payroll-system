import express from 'express';
import {
  getDashboard,
  getTeam
} from '../controllers/deptLeadController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('dept_lead'));

router.get('/dashboard', getDashboard);
router.get('/team', getTeam);

export default router;
