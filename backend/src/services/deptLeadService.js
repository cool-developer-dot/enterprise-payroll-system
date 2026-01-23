import User from '../models/User.js';
import Timesheet from '../models/Timesheet.js';
import Task from '../models/Task.js';
import { ResourceNotFoundError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

/**
 * Get department employees for a dept_lead
 */
export const getDepartmentEmployees = async (deptLeadId) => {
  const deptLead = await User.findById(deptLeadId).select('department departmentId').lean();
  
  if (!deptLead) {
    throw new ResourceNotFoundError('Department Lead');
  }

  const query = {
    role: 'employee',
    status: { $in: ['active', 'on-leave'] }
  };

  if (deptLead.departmentId) {
    query.departmentId = deptLead.departmentId;
  } else if (deptLead.department) {
    query.department = deptLead.department;
  } else {
    // If no department, return empty array
    return [];
  }

  const employees = await User.find(query)
    .select('name email employeeId department position status')
    .sort({ name: 1 })
    .lean();

  return employees;
};

/**
 * Get dashboard data for dept_lead
 */
export const getDashboardData = async (deptLeadId) => {
  const deptLead = await User.findById(deptLeadId).select('department departmentId').lean();
  
  if (!deptLead) {
    throw new ResourceNotFoundError('Department Lead');
  }

  const query = {
    role: 'employee',
    status: { $in: ['active', 'on-leave'] }
  };

  if (deptLead.departmentId) {
    query.departmentId = deptLead.departmentId;
  } else if (deptLead.department) {
    query.department = deptLead.department;
  }

  // Get department employees
  const departmentEmployees = await User.find(query).select('_id').lean();
  const employeeIds = departmentEmployees.map(emp => emp._id);
  
  // Include dept_lead's own ID for tasks
  const allIds = [...employeeIds, new mongoose.Types.ObjectId(deptLeadId)];

  // Get task statistics
  const [totalTasks, pendingTasks, inProgressTasks, completedTasks, overdueTasks] = await Promise.all([
    Task.countDocuments({
      $or: [
        { employeeId: { $in: allIds } },
        { assignedBy: deptLeadId }
      ]
    }),
    Task.countDocuments({
      $or: [
        { employeeId: { $in: allIds } },
        { assignedBy: deptLeadId }
      ],
      status: 'pending'
    }),
    Task.countDocuments({
      $or: [
        { employeeId: { $in: allIds } },
        { assignedBy: deptLeadId }
      ],
      status: 'in-progress'
    }),
    Task.countDocuments({
      $or: [
        { employeeId: { $in: allIds } },
        { assignedBy: deptLeadId }
      ],
      status: 'completed'
    }),
    Task.countDocuments({
      $or: [
        { employeeId: { $in: allIds } },
        { assignedBy: deptLeadId }
      ],
      status: { $ne: 'completed' },
      dueDate: { $lt: new Date() }
    })
  ]);

  // Get pending timesheets count
  const timesheetsPending = await Timesheet.countDocuments({
    employeeId: { $in: employeeIds },
    status: 'submitted'
  });

  // Calculate team performance (completion rate)
  const teamPerformance = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  return {
    departmentEmployees: departmentEmployees.length,
    activeTasks: totalTasks,
    pendingTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    teamPerformance,
    timesheetsPending
  };
};
