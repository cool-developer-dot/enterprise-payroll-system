import Report from '../models/Report.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import FileAttachment from '../models/FileAttachment.js';
import {
  ResourceNotFoundError,
  InvalidInputError,
  AccessDeniedError,
} from '../utils/errorHandler.js';
import { sendSuccess, sendPaginated } from '../utils/responseHandler.js';
import { buildSort, buildPagination, addSearchToQuery } from '../utils/queryBuilder.js';
import { logUserAction } from '../utils/auditLogger.js';
import {
  generateReport,
  saveReport,
  generatePayrollSummary,
  generateAttendanceOverview,
  generateLeaveAnalytics,
  generateDepartmentCosts,
} from '../services/reportService.js';
import {
  generatePayrollReport,
  generateAttendanceReport,
  generateLeaveReport,
  generateDepartmentCostReport,
  generateEmployeeReport,
  generateFinancialReport,
  generatePDF,
  generateExcel,
} from '../services/reportGenerationService.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';

/**
 * GET /api/reports - List reports with filters
 */
export const getReports = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'generatedAt',
      order = 'desc',
      type,
      dateFrom,
      dateTo,
      departmentId,
      createdBy,
    } = req.query;

    const pagination = buildPagination(page, limit);
    const sortObj = buildSort(sort, order);

    let query = {};

    // Apply filters
    if (type) query.reportType = type;
    if (createdBy) {
      query.generatedBy = mongoose.Types.ObjectId.isValid(createdBy)
        ? new mongoose.Types.ObjectId(createdBy)
        : createdBy;
    }
    if (departmentId) {
      query.departmentId = mongoose.Types.ObjectId.isValid(departmentId)
        ? new mongoose.Types.ObjectId(departmentId)
        : departmentId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.$or = [];
      if (dateFrom) {
        query.$or.push({ dateFrom: { $gte: new Date(dateFrom) } });
      }
      if (dateTo) {
        query.$or.push({ dateTo: { $lte: new Date(dateTo) } });
      }
    }

    // Role-based access: managers can only see their own reports
    if (req.user.role === 'manager') {
      query.generatedBy = req.user._id;
    } else if (req.user.role === 'dept_lead') {
      // Dept leads can only see reports for their department
      try {
        const deptLead = await User.findById(req.user._id).select('department departmentId').lean();
        if (deptLead?.departmentId) {
          query.departmentId = deptLead.departmentId;
        } else if (deptLead?.department) {
          // If using department name, we need to find the departmentId
          const department = await Department.findOne({ name: deptLead.department }).select('_id').lean();
          if (department) {
            query.departmentId = department._id;
          }
        }
        // If no department found, dept_lead can only see reports they generated
        if (!query.departmentId) {
          query.generatedBy = req.user._id;
        }
      } catch (err) {
        console.error('[getReports] Error fetching department for dept_lead:', err);
        query.generatedBy = req.user._id; // Fallback to own reports
      }
    }

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('generatedBy', 'name email')
        .populate('departmentId', 'name code')
        .sort(sortObj)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean()
        .exec(),
      Report.countDocuments(query).exec(),
    ]);

    return sendPaginated(res, 'Reports retrieved successfully', reports || [], {
      page: pagination.page,
      limit: pagination.limit,
      total: total || 0,
      totalPages: Math.ceil((total || 0) / pagination.limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/:id - Get report by ID
 */
export const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new InvalidInputError('Invalid report ID format'));
    }

    const report = await Report.findById(id)
      .populate('generatedBy', 'name email')
      .populate('departmentId', 'name code')
      .populate('pdfFileId')
      .populate('excelFileId')
      .lean()
      .exec();

    if (!report) {
      return next(new ResourceNotFoundError('Report'));
    }

    // Check access: managers can only view their own reports
    if (req.user.role === 'manager' && report.generatedBy?._id?.toString() !== req.user._id.toString()) {
      return next(new AccessDeniedError('You can only view your own reports'));
    }

    // Check access: dept_lead can only view reports for their department
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId department').lean();
        if (deptLead?.departmentId) {
          // Check if report is for dept_lead's department
          if (report.departmentId && report.departmentId._id?.toString() !== deptLead.departmentId.toString()) {
            return next(new AccessDeniedError('You can only view reports for your department'));
          }
          // If report has no department, only allow if generated by dept_lead
          if (!report.departmentId && report.generatedBy?._id?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only view reports for your department'));
          }
        } else {
          // If no department assigned, only see own reports
          if (report.generatedBy?._id?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only view your own reports'));
          }
        }
      } catch (err) {
        console.error('[getReportById] Error checking department access for dept_lead:', err);
        // Fallback: only allow own reports
        if (report.generatedBy?._id?.toString() !== req.user._id.toString()) {
          return next(new AccessDeniedError('You can only view your own reports'));
        }
      }
    }

    return sendSuccess(res, 200, 'Report retrieved successfully', { report });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports/generate - Generate a new report
 */
export const generateReportEndpoint = async (req, res, next) => {
  try {
    const { type, dateFrom, dateTo, departmentId, employeeId, expiresInDays = 30 } = req.body;

    // Validate date range
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new InvalidInputError('Invalid date format'));
    }
    if (endDate < startDate) {
      return next(new InvalidInputError('End date must be after start date'));
    }

    // For dept_lead, restrict to their department
    let filteredDepartmentId = departmentId || null;
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId department').lean();
        if (deptLead?.departmentId) {
          filteredDepartmentId = deptLead.departmentId.toString();
          // If a different department was specified, reject it
          if (departmentId && departmentId !== filteredDepartmentId) {
            return next(new AccessDeniedError('You can only generate reports for your department'));
          }
        } else if (deptLead?.department) {
          // If using department name, find the departmentId
          const department = await Department.findOne({ name: deptLead.department }).select('_id').lean();
          if (department) {
            filteredDepartmentId = department._id.toString();
            // If a different department was specified, reject it
            if (departmentId && departmentId !== filteredDepartmentId) {
              return next(new AccessDeniedError('You can only generate reports for your department'));
            }
          }
        }
        // If no department found, dept_lead cannot generate department-wide reports
        if (!filteredDepartmentId && (type === 'department' || type === 'payroll' || type === 'attendance' || type === 'leave')) {
          return next(new AccessDeniedError('You must be assigned to a department to generate this type of report'));
        }
      } catch (err) {
        console.error('[generateReportEndpoint] Error fetching department for dept_lead:', err);
        return next(new AccessDeniedError('Unable to verify department access'));
      }
    }

    // Generate report data (quick summary)
    const reportData = await generateReport(type, dateFrom, dateTo, {
      departmentId: filteredDepartmentId,
      employeeId,
    });

    // Generate detailed report data for file generation
    let detailedReportData = null;
    try {
      switch (type) {
        case 'payroll':
          detailedReportData = await generatePayrollReport(dateFrom, dateTo, filteredDepartmentId);
          break;
        case 'attendance':
          detailedReportData = await generateAttendanceReport(dateFrom, dateTo, filteredDepartmentId);
          break;
        case 'leave':
          detailedReportData = await generateLeaveReport(dateFrom, dateTo, filteredDepartmentId);
          break;
        case 'department':
          detailedReportData = await generateDepartmentCostReport(dateFrom, dateTo);
          break;
        case 'employee':
          if (!employeeId) {
            throw new InvalidInputError('Employee ID is required for employee reports');
          }
          // For dept_lead, verify employee is in their department
          if (req.user.role === 'dept_lead' && filteredDepartmentId) {
            const employee = await User.findById(employeeId).select('departmentId department').lean();
            if (employee?.departmentId?.toString() !== filteredDepartmentId) {
              throw new AccessDeniedError('You can only generate reports for employees in your department');
            }
          }
          detailedReportData = await generateEmployeeReport(employeeId, dateFrom, dateTo);
          break;
        case 'financial':
          detailedReportData = await generateFinancialReport(dateFrom, dateTo, filteredDepartmentId);
          break;
      }
    } catch (error) {
      console.error('Error generating detailed report data:', error);
      // Continue with basic report data if detailed generation fails
    }

    // Save report to database
    const report = await saveReport(reportData, req.user._id, expiresInDays);

    // Generate PDF and Excel files asynchronously (don't wait)
    Promise.all([
      generatePDF(type, detailedReportData || reportData, report._id, req.user).catch(err => {
        console.error('Error generating PDF:', err);
        return null;
      }),
      generateExcel(type, detailedReportData || reportData, report._id, req.user).catch(err => {
        console.error('Error generating Excel:', err);
        return null;
      }),
    ]).then(([pdfResult, excelResult]) => {
      // Update report with file attachments
      const updateData = {};
      if (pdfResult?.fileAttachment) {
        updateData.pdfFileId = pdfResult.fileAttachment._id;
      }
      if (excelResult?.fileAttachment) {
        updateData.excelFileId = excelResult.fileAttachment._id;
      }
      if (Object.keys(updateData).length > 0) {
        Report.findByIdAndUpdate(report._id, updateData).catch(err => {
          console.error('Error updating report with file attachments:', err);
        });
      }
    }).catch(err => {
      console.error('Error in file generation promise:', err);
    });

    // Populate before sending
    const populatedReport = await Report.findById(report._id)
      .populate('generatedBy', 'name email')
      .populate('departmentId', 'name code')
      .lean()
      .exec();

    logUserAction(req, 'create', 'Report', report._id, {
      type,
      dateFrom,
      dateTo,
      departmentId,
    });

    return sendSuccess(res, 201, 'Report generated successfully', { report: populatedReport });
  } catch (error) {
    console.error('Error generating report:', error);
    next(error);
  }
};

/**
 * GET /api/reports/:id/pdf - Download report as PDF
 */
export const getReportPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new InvalidInputError('Invalid report ID format'));
    }

    const report = await Report.findById(id)
      .populate('pdfFileId')
      .lean()
      .exec();

    if (!report) {
      return next(new ResourceNotFoundError('Report'));
    }

    // Check access: managers can only access their own reports
    if (req.user.role === 'manager' && report.generatedBy?.toString() !== req.user._id.toString()) {
      return next(new AccessDeniedError('You can only access your own reports'));
    }

    // Check access: dept_lead can only access reports for their department
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId department').lean();
        if (deptLead?.departmentId) {
          // Get full report to check department
          const fullReport = await Report.findById(id).populate('departmentId').lean();
          if (fullReport?.departmentId && fullReport.departmentId._id?.toString() !== deptLead.departmentId.toString()) {
            return next(new AccessDeniedError('You can only access reports for your department'));
          }
          // If report has no department, only allow if generated by dept_lead
          if (!fullReport?.departmentId && report.generatedBy?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only access reports for your department'));
          }
        } else {
          // If no department assigned, only see own reports
          if (report.generatedBy?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only access your own reports'));
          }
        }
      } catch (err) {
        console.error('[getReportPDF] Error checking department access for dept_lead:', err);
        // Fallback: only allow own reports
        if (report.generatedBy?.toString() !== req.user._id.toString()) {
          return next(new AccessDeniedError('You can only access your own reports'));
        }
      }
    }

    // Check if PDF exists
    if (!report.pdfFileId) {
      return next(new ResourceNotFoundError('PDF file is still being generated. Please try again in a few moments.'));
    }

    const fileAttachment = await FileAttachment.findById(report.pdfFileId);
    if (!fileAttachment) {
      return next(new ResourceNotFoundError('PDF file attachment not found'));
    }

    // Check if file exists
    const fs = await import('fs/promises');
    try {
      await fs.access(fileAttachment.filePath);
    } catch (error) {
      return next(new ResourceNotFoundError('PDF file not found on disk'));
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileAttachment.originalFileName || 'report.pdf'}"`);

    // Stream the file
    const { createReadStream } = await import('fs');
    const fileStream = createReadStream(fileAttachment.filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/:id/excel - Download report as Excel
 */
export const getReportExcel = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new InvalidInputError('Invalid report ID format'));
    }

    const report = await Report.findById(id)
      .populate('excelFileId')
      .lean()
      .exec();

    if (!report) {
      return next(new ResourceNotFoundError('Report'));
    }

    // Check access: managers can only access their own reports
    if (req.user.role === 'manager' && report.generatedBy?.toString() !== req.user._id.toString()) {
      return next(new AccessDeniedError('You can only access your own reports'));
    }

    // Check access: dept_lead can only access reports for their department
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId department').lean();
        if (deptLead?.departmentId) {
          // Get full report to check department
          const fullReport = await Report.findById(id).populate('departmentId').lean();
          if (fullReport?.departmentId && fullReport.departmentId._id?.toString() !== deptLead.departmentId.toString()) {
            return next(new AccessDeniedError('You can only access reports for your department'));
          }
          // If report has no department, only allow if generated by dept_lead
          if (!fullReport?.departmentId && report.generatedBy?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only access reports for your department'));
          }
        } else {
          // If no department assigned, only see own reports
          if (report.generatedBy?.toString() !== req.user._id.toString()) {
            return next(new AccessDeniedError('You can only access your own reports'));
          }
        }
      } catch (err) {
        console.error('[getReportExcel] Error checking department access for dept_lead:', err);
        // Fallback: only allow own reports
        if (report.generatedBy?.toString() !== req.user._id.toString()) {
          return next(new AccessDeniedError('You can only access your own reports'));
        }
      }
    }

    // Check if Excel exists
    if (!report.excelFileId) {
      return next(new ResourceNotFoundError('Excel file is still being generated. Please try again in a few moments.'));
    }

    const fileAttachment = await FileAttachment.findById(report.excelFileId);
    if (!fileAttachment) {
      return next(new ResourceNotFoundError('Excel file attachment not found'));
    }

    // Check if file exists
    const fs = await import('fs/promises');
    try {
      await fs.access(fileAttachment.filePath);
    } catch (error) {
      return next(new ResourceNotFoundError('Excel file not found on disk'));
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileAttachment.originalFileName || 'report.xlsx'}"`);

    // Stream the file
    const { createReadStream } = await import('fs');
    const fileStream = createReadStream(fileAttachment.filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/payroll-summary - Get payroll summary (quick report)
 */
export const getPayrollSummary = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, departmentId } = req.query;

    if (!dateFrom || !dateTo) {
      return next(new InvalidInputError('Date range (dateFrom and dateTo) is required'));
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new InvalidInputError('Invalid date format'));
    }

    // For dept_lead, restrict to their department
    let filteredDepartmentId = departmentId || null;
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId').lean();
        if (deptLead?.departmentId) {
          filteredDepartmentId = deptLead.departmentId.toString();
        } else {
          // If no department, return empty summary
          return sendSuccess(res, 200, 'Payroll summary retrieved successfully', { summary: {} });
        }
      } catch (err) {
        console.error('[getPayrollSummary] Error fetching department for dept_lead:', err);
        return sendSuccess(res, 200, 'Payroll summary retrieved successfully', { summary: {} });
      }
    }

    const summary = await generatePayrollSummary(
      dateFrom,
      dateTo,
      filteredDepartmentId
    );

    return sendSuccess(res, 200, 'Payroll summary retrieved successfully', { summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/attendance-overview - Get attendance overview (quick report)
 */
export const getAttendanceOverview = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, departmentId } = req.query;

    if (!dateFrom || !dateTo) {
      return next(new InvalidInputError('Date range (dateFrom and dateTo) is required'));
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new InvalidInputError('Invalid date format'));
    }

    // For dept_lead, restrict to their department
    let filteredDepartmentId = departmentId || null;
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId').lean();
        if (deptLead?.departmentId) {
          filteredDepartmentId = deptLead.departmentId.toString();
        } else {
          return sendSuccess(res, 200, 'Attendance overview retrieved successfully', { overview: {} });
        }
      } catch (err) {
        console.error('[getAttendanceOverview] Error fetching department for dept_lead:', err);
        return sendSuccess(res, 200, 'Attendance overview retrieved successfully', { overview: {} });
      }
    }

    const overview = await generateAttendanceOverview(
      dateFrom,
      dateTo,
      filteredDepartmentId
    );

    return sendSuccess(res, 200, 'Attendance overview retrieved successfully', { overview });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/leave-analytics - Get leave analytics (quick report)
 */
export const getLeaveAnalytics = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, departmentId } = req.query;

    if (!dateFrom || !dateTo) {
      return next(new InvalidInputError('Date range (dateFrom and dateTo) is required'));
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new InvalidInputError('Invalid date format'));
    }

    // For dept_lead, restrict to their department
    let filteredDepartmentId = departmentId || null;
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('departmentId').lean();
        if (deptLead?.departmentId) {
          filteredDepartmentId = deptLead.departmentId.toString();
        } else {
          return sendSuccess(res, 200, 'Leave analytics retrieved successfully', { analytics: {} });
        }
      } catch (err) {
        console.error('[getLeaveAnalytics] Error fetching department for dept_lead:', err);
        return sendSuccess(res, 200, 'Leave analytics retrieved successfully', { analytics: {} });
      }
    }

    const analytics = await generateLeaveAnalytics(
      dateFrom,
      dateTo,
      filteredDepartmentId
    );

    return sendSuccess(res, 200, 'Leave analytics retrieved successfully', { analytics });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/department-costs - Get department costs (quick report)
 */
export const getDepartmentCosts = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return next(new InvalidInputError('Date range (dateFrom and dateTo) is required'));
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new InvalidInputError('Invalid date format'));
    }

    // For dept_lead, only show their department costs
    // Note: generateDepartmentCosts may need to be updated to accept departmentId filter
    // For now, we'll filter the results after generation
    const costs = await generateDepartmentCosts(dateFrom, dateTo);
    
    if (req.user.role === 'dept_lead') {
      try {
        const deptLead = await User.findById(req.user._id).select('department departmentId').lean();
        if (deptLead?.departmentId && costs && Array.isArray(costs)) {
          // Filter costs to only show dept_lead's department
          const filteredCosts = costs.filter(cost => 
            cost.departmentId?.toString() === deptLead.departmentId.toString() ||
            cost.department === deptLead.department
          );
          return sendSuccess(res, 200, 'Department costs retrieved successfully', { costs: filteredCosts });
        } else if (deptLead?.department && costs && Array.isArray(costs)) {
          const filteredCosts = costs.filter(cost => cost.department === deptLead.department);
          return sendSuccess(res, 200, 'Department costs retrieved successfully', { costs: filteredCosts });
        } else {
          return sendSuccess(res, 200, 'Department costs retrieved successfully', { costs: [] });
        }
      } catch (err) {
        console.error('[getDepartmentCosts] Error fetching department for dept_lead:', err);
        return sendSuccess(res, 200, 'Department costs retrieved successfully', { costs: [] });
      }
    }

    return sendSuccess(res, 200, 'Department costs retrieved successfully', { costs });
  } catch (error) {
    next(error);
  }
};
