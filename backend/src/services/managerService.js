import User from '../models/User.js';
import Timesheet from '../models/Timesheet.js';
import LeaveRequest from '../models/LeaveRequest.js';
import PerformanceUpdate from '../models/PerformanceUpdate.js';
import UserSession from '../models/UserSession.js';
import { ResourceNotFoundError, InvalidInputError, AccessDeniedError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

export const getDirectReports = async (managerId) => {
  const reports = await User.find({ 
    $or: [
      { managerId: managerId },
      { reportsTo: managerId }
    ],
    role: 'employee',
    status: { $in: ['active', 'on-leave'] }
  })
    .select('name email employeeId department position status managerId reportsTo')
    .sort({ name: 1 })
    .lean();
  return reports;
};

export const getDashboardData = async (managerId) => {
  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const [pendingTimesheets, pendingLeaveRequests] = await Promise.all([
    Timesheet.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    }),
    LeaveRequest.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
  ]);

  return {
    teamMembers: directReports.length,
    directReports: directReports.length,
    pendingApprovals: pendingTimesheets + pendingLeaveRequests,
    timesheetsSubmitted: pendingTimesheets,
    leaveRequestsPending: pendingLeaveRequests
  };
};

export const getTeamMemberDetails = async (managerId, employeeId) => {
  const employee = await User.findOne({
    _id: employeeId,
    role: 'employee'
  }).lean();

  if (!employee) {
    throw new ResourceNotFoundError('Team member');
  }

  return employee;
};

export const getPendingApprovals = async (managerId) => {
  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const [timesheets, leaveRequests] = await Promise.all([
    Timesheet.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    }),
    LeaveRequest.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
  ]);

  return {
    timesheets,
    leaveRequests,
    total: timesheets + leaveRequests
  };
};

export const getPendingTimesheets = async (managerId, pagination = {}) => {
  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const [timesheets, total] = await Promise.all([
    Timesheet.find({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
      .populate('employeeId', 'name email employeeId')
      .populate('payrollPeriodId', 'periodStart periodEnd')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Timesheet.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
  ]);

  return {
    timesheets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getPendingLeaveRequests = async (managerId, pagination = {}) => {
  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const [leaveRequests, total] = await Promise.all([
    LeaveRequest.find({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
      .populate('employeeId', 'name email employeeId')
      .sort({ submittedDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments({
      employeeId: { $in: reportIds },
      status: 'pending'
    })
  ]);

  return {
    leaveRequests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getPerformanceUpdates = async (managerId, filters = {}, pagination = {}) => {
  const { employeeId, startDate, endDate } = filters;
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const query = { managerId };

  if (employeeId) {
    if (!reportIds.some(id => id.toString() === employeeId.toString())) {
      throw new AccessDeniedError('You can only view performance updates for your direct reports');
    }
    query.employeeId = employeeId;
  } else {
    query.employeeId = { $in: reportIds };
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const [updates, total] = await Promise.all([
    PerformanceUpdate.find(query)
      .populate('employeeId', 'name email employeeId department')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PerformanceUpdate.countDocuments(query)
  ]);

  return {
    updates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const createPerformanceUpdate = async (managerId, updateData) => {
  const employee = await User.findOne({
    _id: updateData.employeeId,
    role: 'employee'
  });

  if (!employee) {
    throw new ResourceNotFoundError('Employee');
  }

  const performanceUpdate = new PerformanceUpdate({
    ...updateData,
    managerId,
    employeeName: employee.name,
    employeeDepartment: employee.department?.name || employee.department
  });

  await performanceUpdate.save();
  return performanceUpdate.toObject();
};

export const getPerformanceUpdateById = async (managerId, updateId) => {
  const update = await PerformanceUpdate.findById(updateId)
    .populate('employeeId', 'name email employeeId department')
    .lean();

  if (!update) {
    throw new ResourceNotFoundError('Performance update');
  }

  if (update.managerId.toString() !== managerId.toString()) {
    throw new AccessDeniedError('You can only access your own performance updates');
  }

  return update;
};

export const updatePerformanceUpdate = async (managerId, updateId, updateData) => {
  const update = await PerformanceUpdate.findById(updateId);

  if (!update) {
    throw new ResourceNotFoundError('Performance update');
  }

  if (update.managerId.toString() !== managerId.toString()) {
    throw new AccessDeniedError('You can only update your own performance updates');
  }

  Object.keys(updateData).forEach(key => {
    if (key !== '_id' && key !== 'managerId' && key !== 'employeeId') {
      update[key] = updateData[key];
    }
  });

  await update.save();
  return update.toObject();
};

export const getTeamPerformance = async (managerId) => {
  const directReports = await getDirectReports(managerId);
  const reportIds = directReports.map(r => r._id);

  const updates = await PerformanceUpdate.find({
    managerId,
    employeeId: { $in: reportIds }
  })
    .sort({ date: -1 })
    .limit(100)
    .lean();

  const avgRating = updates.length > 0
    ? updates.reduce((sum, u) => sum + u.rating, 0) / updates.length
    : 0;

  const ratingDistribution = {
    5: updates.filter(u => u.rating === 5).length,
    4: updates.filter(u => u.rating === 4).length,
    3: updates.filter(u => u.rating === 3).length,
    2: updates.filter(u => u.rating === 2).length,
    1: updates.filter(u => u.rating === 1).length
  };

  return {
    totalUpdates: updates.length,
    averageRating: Math.round(avgRating * 10) / 10,
    ratingDistribution,
    teamMembers: directReports.length
  };
};

/**
 * Get manager settings (profile and preferences)
 */
export const getManagerSettings = async (managerId) => {
  const user = await User.findById(managerId)
    .select('-password')
    .populate('departmentId', 'name code')
    .lean();

  if (!user) {
    throw new ResourceNotFoundError('Manager');
  }

  // Extract preferences with defaults
  const preferences = user.preferences || {};
  const notificationPreferences = preferences.notifications || {
    email: true,
    push: true,
    sms: false
  };

  return {
    profile: {
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      photo: user.photo,
      department: user.department || user.departmentId?.name,
      position: user.position
    },
    preferences: {
      emailNotifications: notificationPreferences.email !== false,
      approvalNotifications: notificationPreferences.email !== false, // Default to email notifications
      defaultPeriod: preferences.defaultPeriod || 'current-month',
      language: preferences.language || 'en',
      timezone: preferences.timezone,
      dateFormat: preferences.dateFormat || 'MM/DD/YYYY',
      theme: preferences.theme || 'light'
    }
  };
};

/**
 * Update manager settings (profile and preferences)
 */
export const updateManagerSettings = async (managerId, settingsData) => {
  const user = await User.findById(managerId);

  if (!user) {
    throw new ResourceNotFoundError('Manager');
  }

  // Update profile fields if provided
  if (settingsData.name !== undefined) {
    user.name = settingsData.name.trim();
  }
  if (settingsData.phone !== undefined) {
    user.phone = settingsData.phone?.trim() || null;
  }

  // Update preferences
  if (settingsData.preferences) {
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update notification preferences
    if (settingsData.preferences.emailNotifications !== undefined || 
        settingsData.preferences.approvalNotifications !== undefined) {
      if (!user.preferences.notifications) {
        user.preferences.notifications = {};
      }
      if (settingsData.preferences.emailNotifications !== undefined) {
        user.preferences.notifications.email = settingsData.preferences.emailNotifications;
      }
      // Approval notifications use email notifications setting
      if (settingsData.preferences.approvalNotifications !== undefined) {
        user.preferences.notifications.email = settingsData.preferences.approvalNotifications;
      }
    }

    // Update other preferences
    if (settingsData.preferences.defaultPeriod !== undefined) {
      user.preferences.defaultPeriod = settingsData.preferences.defaultPeriod;
    }
    if (settingsData.preferences.language !== undefined) {
      user.preferences.language = settingsData.preferences.language;
    }
    if (settingsData.preferences.timezone !== undefined) {
      user.preferences.timezone = settingsData.preferences.timezone;
    }
    if (settingsData.preferences.dateFormat !== undefined) {
      user.preferences.dateFormat = settingsData.preferences.dateFormat;
    }
    if (settingsData.preferences.theme !== undefined) {
      user.preferences.theme = settingsData.preferences.theme;
    }
  }

  await user.save();

  // Return updated settings
  return await getManagerSettings(managerId);
};

/**
 * Get active sessions for a manager
 */
export const getManagerSessions = async (managerId, currentSessionToken) => {
  const sessions = await UserSession.find({
    userId: managerId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
    .sort({ lastActivity: -1 })
    .lean();

  // Format sessions for frontend
  const formattedSessions = sessions.map(session => {
    const isCurrent = session.sessionToken === currentSessionToken;
    
    // Parse user agent for device info
    const userAgent = session.userAgent || '';
    let device = 'Unknown Device';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (userAgent) {
      // Simple device detection
      if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
        device = 'Mobile';
      } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        device = 'Tablet';
      } else {
        device = 'Desktop';
      }

      // Browser detection
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        browser = 'Chrome';
      } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
      } else if (userAgent.includes('Edg')) {
        browser = 'Edge';
      }

      // OS detection
      if (userAgent.includes('Windows')) {
        os = 'Windows';
      } else if (userAgent.includes('Mac')) {
        os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        os = 'Linux';
      } else if (userAgent.includes('Android')) {
        os = 'Android';
      } else if (userAgent.includes('iOS')) {
        os = 'iOS';
      }
    }

    // Format location
    const location = session.location
      ? `${session.location.city || ''}${session.location.city && session.location.country ? ', ' : ''}${session.location.country || ''}`.trim() || 'Unknown Location'
      : 'Unknown Location';

    // Format last active time
    const lastActive = session.lastActivity
      ? new Date(session.lastActivity).toLocaleString()
      : 'Unknown';

    return {
      _id: session._id.toString(),
      device: `${device} (${browser} on ${os})`,
      location: location,
      lastActive: lastActive,
      ipAddress: session.ipAddress || 'Unknown',
      current: isCurrent,
      createdAt: session.createdAt
    };
  });

  return formattedSessions;
};
