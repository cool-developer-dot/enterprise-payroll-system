import {
  getDashboardData,
  getDepartmentEmployees
} from '../services/deptLeadService.js';
import { sendSuccess } from '../utils/responseHandler.js';

export const getDashboard = async (req, res, next) => {
  try {
    const deptLeadId = req.user._id;
    const data = await getDashboardData(deptLeadId);
    return sendSuccess(res, 200, 'Dashboard data retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (req, res, next) => {
  try {
    const deptLeadId = req.user._id;
    const team = await getDepartmentEmployees(deptLeadId);
    return sendSuccess(res, 200, 'Team retrieved successfully', { team });
  } catch (error) {
    next(error);
  }
};
