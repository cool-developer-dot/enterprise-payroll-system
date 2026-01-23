import User from '../models/User.js';
import Department from '../models/Department.js';
import { 
  ResourceNotFoundError, 
  InvalidInputError, 
  DuplicateResourceError,
  AuthenticationFailedError,
  AppError 
} from '../utils/errorHandler.js';
import { sendSuccess, sendPaginated, createPagination } from '../utils/responseHandler.js';
import { buildQuery, buildSort, buildPagination, addSearchToQuery } from '../utils/queryBuilder.js';
import { logUserAction } from '../utils/auditLogger.js';
import { ensureMongoConnected, executeWithRetry } from '../utils/dbUtils.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const getChanges = (before, after) => {
  const changes = {
    before: {},
    after: {},
    fields: [],
  };
  
  const fieldsToTrack = ['name', 'email', 'role', 'department', 'status', 'employmentType', 'position', 'baseSalary'];
  
  fieldsToTrack.forEach(field => {
    if (before[field] !== after[field]) {
      changes.before[field] = before[field];
      changes.after[field] = after[field];
      changes.fields.push(field);
    }
  });
  
  return changes.fields.length > 0 ? changes : null;
};

export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', search, role, status, employmentType, departmentId, department } = req.query;
    
    const pagination = buildPagination(page, limit);
    const sortObj = buildSort(sort, order);
    
    let query = {};
    
    // Role-based access control - dept_lead can only see their department
    if (req.user.role === 'dept_lead') {
      // Get dept_lead's department
      const deptLead = await User.findById(req.user._id).select('department departmentId').lean();
      if (deptLead?.department) {
        query.department = deptLead.department;
      } else if (deptLead?.departmentId) {
        query.departmentId = deptLead.departmentId;
      } else {
        // If dept_lead has no department, they can only see themselves
        query._id = req.user._id;
      }
    }
    
    // Apply filters (these can override dept_lead restrictions for admin/manager)
    if (role) query.role = role;
    if (status) query.status = status;
    if (employmentType) query.employmentType = employmentType;
    if (departmentId) query.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (department) query.department = department;
    
    // Add search
    if (search) {
      query = addSearchToQuery(query, search, ['name', 'email', 'employeeId']);
    }
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('departmentId', 'name code')
        .populate('managerId', 'name email')
        .sort(sortObj)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      User.countDocuments(query),
    ]);
    
    return sendPaginated(res, 'Users retrieved successfully', users, {
      ...pagination,
      total,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password')
      .populate('departmentId', 'name code description')
      .populate('managerId', 'name email role')
      .lean();
    
    if (!user) {
      return next(new ResourceNotFoundError('User'));
    }
    
    return sendSuccess(res, 200, 'User retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user (Admin only)
 * Only administrators can create user accounts with email and password
 * Password will be automatically hashed by User model pre-save hook
 */
export const createUser = async (req, res, next) => {
  try {
    // Validate required fields for user creation
    if (!req.body.email || !req.body.password || !req.body.name || !req.body.role) {
      return next(new InvalidInputError('Email, password, name, and role are required to create a user account'));
    }

    // Prepare user data - password will be hashed by User model pre-save hook
    const userData = {
      email: req.body.email?.toLowerCase().trim(),
      password: req.body.password, // Plain password - will be hashed by pre-save hook
      name: req.body.name?.trim(),
      role: req.body.role,
      ...(req.body.employeeId && { employeeId: req.body.employeeId.trim() }),
      ...(req.body.departmentId && { 
        departmentId: new mongoose.Types.ObjectId(req.body.departmentId) 
      }),
      ...(req.body.department && { department: req.body.department.trim() }),
      ...(req.body.position && { position: req.body.position.trim() }),
      ...(req.body.phone && { phone: req.body.phone.trim() }),
      ...(req.body.employmentType && { employmentType: req.body.employmentType }),
      ...(req.body.baseSalary !== undefined && { baseSalary: parseFloat(req.body.baseSalary) }),
      status: req.body.status || 'active',
      isEmailVerified: false, // Email verification can be done later
      createdBy: req.user._id, // Track which admin created this user
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Check for duplicate email
    const existingEmailUser = await User.findOne({ email: userData.email });
    if (existingEmailUser) {
      return next(new DuplicateResourceError('An account with this email address already exists'));
    }
    
    // Check for duplicate employeeId if provided
    if (userData.employeeId) {
      const existingEmployeeIdUser = await User.findOne({ employeeId: userData.employeeId });
      if (existingEmployeeIdUser) {
        return next(new DuplicateResourceError('An account with this employee ID already exists'));
      }
    }
    
    // Handle department mapping - if departmentId is provided, validate and set department name
    // If only department name is provided, look up departmentId
    if (userData.departmentId) {
      const department = await Department.findById(userData.departmentId);
      if (!department) {
        return next(new ResourceNotFoundError('Department not found'));
      }
      userData.department = department.name;
    } else if (userData.department) {
      // If only department name is provided, look up departmentId for proper relationship
      const department = await Department.findOne({ name: userData.department, status: 'active' });
      if (department) {
        userData.departmentId = department._id;
      }
      // If department not found by name, still allow creation with just department name
      // This provides flexibility for departments that might not exist in Department collection
    }
    
    // Create user - password will be automatically hashed by User model pre-save hook
    const user = await User.create(userData);
    
    // Update department employee count if department is assigned
    if (user.departmentId) {
      await Department.findByIdAndUpdate(user.departmentId, {
        $inc: { 
          employeeCount: 1, 
          activeEmployeeCount: user.status === 'active' ? 1 : 0 
        }
      });
    }
    
    // Audit log - track that admin created this user
    try {
      await logUserAction(
        req, 
        'create', 
        'user', 
        user._id, 
        null, 
        `Admin ${req.user.name} (${req.user.email}) created user: ${user.name} (${user.email}) with role: ${user.role}`
      );
    } catch (auditError) {
      // Don't fail user creation if audit logging fails
      console.warn('Audit logging failed:', auditError.message);
    }
    
    // Return user data without password
    const userResponse = await User.findById(user._id)
      .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
      .populate('departmentId', 'name code')
      .populate('managerId', 'name email')
      .populate('createdBy', 'name email')
      .lean();
    
    // Log successful user creation (production-ready logging)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[USER_CREATED] Admin: ${req.user.email}, Created User: ${user.email}, Role: ${user.role}`);
    }
    
    return sendSuccess(res, 201, 'User account created successfully. Credentials have been set up.', { user: userResponse });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return next(new DuplicateResourceError(`User with this ${field} already exists`));
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map((e) => e.message);
      return next(new InvalidInputError(`Validation failed: ${errors.join('. ')}`));
    }
    
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Allow self-update for profile fields, admin/manager for all fields
    const isSelf = req.user._id.toString() === id;
    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';
    
    if (!isSelf && !isAdmin && !isManager) {
      return next(new AuthenticationFailedError('You can only update your own profile'));
    }
    
    const user = await User.findById(id);
    if (!user) {
      return next(new ResourceNotFoundError('User'));
    }
    
    // If self-update, restrict to profile fields only
    let updateData = { ...req.body };
    if (isSelf && !isAdmin && !isManager) {
      const allowedFields = ['name', 'phone', 'photo', 'bio', 'address', 'emergencyContact', 'preferences', 'dateOfBirth'];
      const restrictedData = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          restrictedData[field] = updateData[field];
        }
      });
      updateData = restrictedData;
    }
    
    const before = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      employmentType: user.employmentType,
      position: user.position,
      baseSalary: user.baseSalary,
    };
    
    // Process update data
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }
    if (updateData.departmentId) {
      updateData.departmentId = new mongoose.Types.ObjectId(updateData.departmentId);
      const department = await Department.findById(updateData.departmentId);
      if (department) {
        updateData.department = department.name;
      }
    }
    
    // Don't allow password update through this endpoint
    delete updateData.password;
    
    Object.assign(user, updateData);
    await user.save();
    
    const after = {
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      employmentType: user.employmentType,
      position: user.position,
      baseSalary: user.baseSalary,
    };
    
    // Update department employee counts if department changed
    if (before.departmentId?.toString() !== user.departmentId?.toString()) {
      if (before.departmentId) {
        await Department.findByIdAndUpdate(before.departmentId, {
          $inc: { employeeCount: -1, activeEmployeeCount: before.status === 'active' ? -1 : 0 }
        });
      }
      if (user.departmentId) {
        await Department.findByIdAndUpdate(user.departmentId, {
          $inc: { employeeCount: 1, activeEmployeeCount: user.status === 'active' ? 1 : 0 }
        });
      }
    } else if (before.status !== user.status && user.departmentId) {
      // Status changed, update active count
      const statusChange = user.status === 'active' ? 1 : (before.status === 'active' ? -1 : 0);
      if (statusChange !== 0) {
        await Department.findByIdAndUpdate(user.departmentId, {
          $inc: { activeEmployeeCount: statusChange }
        });
      }
    }
    
    // Audit log
    const changes = getChanges(before, after);
    await logUserAction(req, 'update', 'user', user._id, changes, `Updated user: ${user.name}`);
    
    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('departmentId', 'name code')
      .populate('managerId', 'name email')
      .lean();
    
    return sendSuccess(res, 200, 'User updated successfully', { user: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      return next(new DuplicateResourceError('User with this email or employee ID already exists'));
    }
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return next(new ResourceNotFoundError('User'));
    }
    
    // Soft delete - set status to terminated
    user.status = 'terminated';
    user.terminationDate = new Date();
    await user.save();
    
    // Update department employee counts
    if (user.departmentId) {
      await Department.findByIdAndUpdate(user.departmentId, {
        $inc: { employeeCount: -1, activeEmployeeCount: user.status === 'active' ? -1 : 0 }
      });
    }
    
    // Audit log
    await logUserAction(req, 'delete', 'user', user._id, null, `Deleted user: ${user.name}`);
    
    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getCurrentUserProfile = async (req, res, next) => {
  try {
    // Ensure database connection is ready
    try {
      ensureMongoConnected();
    } catch (dbError) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    const user = await executeWithRetry(async () => {
      return await User.findById(req.user._id)
      .select('-password')
      .populate('departmentId', 'name code description')
      .populate('managerId', 'name email role')
      .lean();
    });
    
    if (!user) {
      return next(new ResourceNotFoundError('User not found'));
    }
    
    // Construct full photo URL if photo exists (using request host for flexibility)
    if (user.photo && !user.photo.startsWith('http')) {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || process.env.API_HOST || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`.replace('/api', '');
      
      // Add cache-busting parameter if photo exists
      // Remove existing query params and add timestamp
      const photoPath = user.photo.split('?')[0];
      const timestamp = Date.now();
      user.photo = `${baseUrl}${photoPath}?t=${timestamp}`;
    }
    
    return sendSuccess(res, 200, 'Profile retrieved successfully', { user });
  } catch (error) {
    // Handle connection errors
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    if (error.isOperational || error.statusCode) {
      return next(error);
    }
    
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError(
        'Failed to retrieve profile. Please try again later.',
        500
      ));
    }
    
    next(error);
  }
};

export const updateCurrentUserProfile = async (req, res, next) => {
  try {
    // Ensure database connection is ready
    try {
      ensureMongoConnected();
    } catch (dbError) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    const user = await executeWithRetry(async () => {
      return await User.findById(req.user._id);
    });
    
    if (!user) {
      return next(new ResourceNotFoundError('User not found'));
    }
    
    const before = {
      name: user.name,
      phone: user.phone,
      photo: user.photo,
      bio: user.bio,
    };
    
    // Only allow updating specific profile fields
    const allowedFields = ['name', 'phone', 'photo', 'bio', 'address', 'emergencyContact', 'preferences', 'dateOfBirth'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Handle file upload if photo is uploaded
    if (req.file) {
      // Delete old photo if exists (non-blocking)
      if (user.photo) {
        try {
          const oldPhotoPath = path.join(process.cwd(), 'uploads', 'profiles', path.basename(user.photo));
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old profile photo:', deleteError.message);
        }
      }
      
      // Set photo path - relative to uploads directory for serving
      updateData.photo = `/uploads/profiles/${req.file.filename}`;
    }
    
    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }
    if (updateData.phone) {
      updateData.phone = updateData.phone.trim();
    }
    
    // Normalize role if needed (department_lead -> dept_lead)
    if (user.role === 'department_lead') {
      user.role = 'dept_lead';
    }
    
    Object.assign(user, updateData);
    
    // Save with retry logic
    await executeWithRetry(async () => {
      return await user.save();
    });
    
    const after = {
      name: user.name,
      phone: user.phone,
      photo: user.photo,
      bio: user.bio,
    };
    
    // Audit log (non-blocking)
    try {
    const changes = getChanges(before, after);
    await logUserAction(req, 'update', 'user', user._id, changes, 'Updated own profile');
    } catch (auditError) {
      console.warn('Failed to log profile update:', auditError.message);
    }
    
    const userResponse = await executeWithRetry(async () => {
      return await User.findById(user._id)
      .select('-password')
      .populate('departmentId', 'name code')
      .lean();
    });
    
    return sendSuccess(res, 200, 'Profile updated successfully', { user: userResponse });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (deleteError) {
        console.warn('Failed to delete uploaded file on error:', deleteError.message);
      }
    }
    
    // Handle connection errors
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    if (error.isOperational || error.statusCode) {
      return next(error);
    }
    
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError(
        'Failed to update profile. Please try again later.',
        500
      ));
    }
    
    next(error);
  }
};

export const uploadProfilePhoto = async (req, res, next) => {
  let uploadedFile = null;
  
  try {
    // Validate file was uploaded
    if (!req.file) {
      return next(new InvalidInputError('No photo file provided. Please select an image file.'));
    }
    
    uploadedFile = req.file;
    
    // Validate file exists and has valid size
    if (!fs.existsSync(uploadedFile.path)) {
      return next(new InvalidInputError('Uploaded file not found. Please try again.'));
    }
    
    if (uploadedFile.size === 0) {
      // Clean up empty file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return next(new InvalidInputError('Uploaded file is empty. Please select a valid image file.'));
    }
    
    // Ensure database connection is ready
    try {
      ensureMongoConnected();
    } catch (dbError) {
      // Clean up uploaded file on DB error
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    // Execute database operations with retry logic
    const user = await executeWithRetry(async () => {
      return await User.findById(req.user._id);
    });
    
    if (!user) {
      // Delete uploaded file if user not found
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return next(new ResourceNotFoundError('User not found'));
    }
    
    const before = { photo: user.photo };
    const oldPhotoPath = user.photo ? path.join(process.cwd(), 'uploads', 'profiles', path.basename(user.photo)) : null;
    
    // Delete old photo if exists (non-blocking)
    if (user.photo && oldPhotoPath && fs.existsSync(oldPhotoPath)) {
      try {
        fs.unlinkSync(oldPhotoPath);
      } catch (deleteError) {
        // Log but don't fail the upload if old photo deletion fails
        console.warn('Failed to delete old profile photo:', deleteError.message);
      }
    }
    
    // Normalize role if needed (department_lead -> dept_lead)
    if (user.role === 'department_lead') {
      user.role = 'dept_lead';
    }
    
    // Update user photo path - use relative path from root for serving
    const photoPath = `/uploads/profiles/${uploadedFile.filename}`;
    user.photo = photoPath;
    
    // Save user with retry logic
    await executeWithRetry(async () => {
      return await user.save();
    });
    
    const after = { photo: user.photo };
    
    // Audit log (non-blocking, don't fail if this fails)
    try {
      const changes = getChanges(before, after);
      await logUserAction(req, 'update', 'user', user._id, changes, 'Uploaded profile photo');
    } catch (auditError) {
      console.warn('Failed to log profile photo upload:', auditError.message);
    }
    
    // Fetch updated user with retry
    const userResponse = await executeWithRetry(async () => {
      return await User.findById(user._id)
        .select('-password')
        .populate('departmentId', 'name code')
        .lean();
    });
    
    // Construct full photo URL for frontend using request protocol and host
    // Photo path is stored as /uploads/profiles/filename, served at /uploads/
    // Use request host to construct the correct URL (works with any domain/port)
    const protocol = req.protocol || (req.secure ? 'https' : 'http') || 'http';
    const host = req.get('host') || req.get('x-forwarded-host') || process.env.API_HOST || 'localhost:5000';
    const baseUrl = `${protocol}://${host}`.replace('/api', '');
    
    // Construct photo URL with cache-busting timestamp to prevent caching issues
    const timestamp = Date.now();
    const photoUrl = photoPath.startsWith('http') 
      ? `${photoPath}${photoPath.includes('?') ? '&' : '?'}t=${timestamp}` 
      : `${baseUrl}${photoPath}?t=${timestamp}`;
    
    // Ensure userResponse has the correct photo URL (full URL, not relative path)
    if (userResponse) {
      userResponse.photo = photoUrl;
    }
    
    // Return response with both user and photoUrl for compatibility
    return sendSuccess(res, 200, 'Profile photo uploaded successfully', { 
      user: userResponse,
      photoUrl: photoUrl
    });
  } catch (error) {
    // Clean up uploaded file on any error
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch (deleteError) {
        console.warn('Failed to delete uploaded file on error:', deleteError.message);
      }
    }
    
    // Handle connection errors with user-friendly messages
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }
    
    // Re-throw operational errors
    if (error.isOperational || error.statusCode) {
      return next(error);
    }
    
    // For unexpected errors, return generic message in production
    if (process.env.NODE_ENV === 'production') {
      return next(new AppError(
        'Failed to upload profile photo. Please try again later.',
        500
      ));
    }
    
    next(error);
  }
};

export const getUniqueRoles = async (req, res, next) => {
  try {
    const roles = await User.distinct('role', { role: { $exists: true } });
    return sendSuccess(res, 200, 'Roles retrieved successfully', { roles });
  } catch (error) {
    next(error);
  }
};

export const getUniqueDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ status: 'active' }).select('name').lean();
    const departmentNames = departments.map(d => d.name).sort();
    return sendSuccess(res, 200, 'Departments retrieved successfully', { departments: departmentNames });
  } catch (error) {
    next(error);
  }
};

/**
 * Download current user profile as PDF
 * Users can download their own profile
 * Admins can download any profile
 */
export const downloadProfilePDF = async (req, res, next) => {
  try {
    // Ensure database connection is ready
    try {
      ensureMongoConnected();
    } catch (dbError) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }

    // Get user ID from params (if provided) or use current user's ID
    // Route: /profile/download -> req.params.id is undefined (user downloads own profile)
    // Route: /:id/download -> req.params.id is set (admin can download any user's profile)
    const requestedUserId = req.params.id;
    const currentUserId = req.user._id ? req.user._id.toString() : null;
    
    // Ensure currentUserId exists (should always exist if authenticated)
    if (!currentUserId) {
      return next(new AuthenticationFailedError('User ID not found. Please log in again.'));
    }
    
    // Determine which user's profile to download
    let targetUserId;
    if (requestedUserId && requestedUserId.trim() !== '') {
      // A specific user ID was requested (only admins can download other users' profiles)
      if (req.user.role !== 'admin') {
        return next(new AuthenticationFailedError('You do not have permission to download other users\' profiles. Only administrators can download profiles of other users.'));
      }
      // Normalize the requested user ID to string
      targetUserId = requestedUserId.toString().trim();
    } else {
      // No user ID provided - user wants to download their own profile (allowed for all authenticated users)
      targetUserId = currentUserId;
    }
    
    // Final security check: ensure users can only download their own profile unless they're admin
    // This is a redundant check but adds an extra layer of security
    if (targetUserId !== currentUserId && req.user.role !== 'admin') {
      return next(new AuthenticationFailedError('You do not have permission to download this profile. You can only download your own profile.'));
    }
    
    // Use targetUserId for fetching the user data
    const userId = targetUserId;

    // Fetch user data
    const user = await executeWithRetry(async () => {
      return await User.findById(userId)
        .select('-password -refreshToken -passwordResetToken -emailVerificationToken')
        .populate('departmentId', 'name code description')
        .populate('managerId', 'name email role employeeId')
        .lean();
    });

    if (!user) {
      return next(new ResourceNotFoundError('User not found'));
    }

    // Format currency helper
    const formatCurrency = (amount) => {
      if (amount === undefined || amount === null) return 'Not Set';
      if (amount === 0) return 'Rs 0';
      return `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Format date helper - returns proper format or "Not Set" if null
    const formatDate = (date) => {
      if (!date) return 'Not Set';
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        return dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (error) {
        return 'Invalid Date';
      }
    };

    // Format date and time helper for generated timestamp
    const formatDateTime = (date) => {
      try {
        const dateObj = new Date(date);
        return dateObj.toLocaleString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } catch (error) {
        return new Date().toLocaleString('en-US');
      }
    };

    // Get role-specific title
    const getRoleTitle = (role) => {
      const roleTitles = {
        'admin': 'Administrator Profile',
        'manager': 'Manager Profile',
        'employee': 'Employee Profile'
      };
      return roleTitles[role?.toLowerCase()] || 'User Profile';
    };

    // Create PDF document
    const roleTitle = getRoleTitle(user.role);
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4',
      info: {
        Title: `${user.name} - ${roleTitle}`,
        Author: 'MeeTech Labs Management system',
        Subject: roleTitle,
        Creator: 'MeeTech Labs Management system',
        CreationDate: new Date()
      }
    });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${user.name.replace(/\s+/g, '_')}_${roleTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Pipe PDF directly to response
    doc.pipe(res);

    // Header with role-specific title
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text(roleTitle, { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated: ${formatDateTime(new Date())}`, { align: 'center' });
    
    doc.moveDown(2);

    // Personal Information Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Personal Information', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(11);

    const leftColumn = 60;
    const rightColumn = 300;
    const lineHeight = 18;

    // Helper function to add a label-value pair with proper formatting
    const addField = (label, value, bold = false) => {
      const currentY = doc.y;
      const displayValue = (value !== null && value !== undefined && value !== '') ? String(value) : 'Not Set';
      doc.font('Helvetica').text(label + ':', leftColumn, currentY);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(displayValue, rightColumn, currentY);
      doc.y = currentY + lineHeight;
    };

    // Personal Information Section
    addField('Full Name', user.name, true);
    addField('Email', user.email);
    
    // Employee ID - show if exists, otherwise show "Not Assigned"
    const employeeId = user.employeeId && user.employeeId.trim() !== '' ? user.employeeId : 'Not Assigned';
    addField('Employee ID', employeeId);
    
    // Role - properly formatted
    const roleText = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Not Set';
    addField('Role', roleText, true);
    
    // Status - properly formatted
    const statusText = user.status 
      ? user.status.charAt(0).toUpperCase() + user.status.slice(1).replace(/-/g, ' ') 
      : 'Not Set';
    addField('Status', statusText, true);
    
    doc.moveDown(0.5);

    // Employment Details Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Employment Details', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(11);

    // Department - check both department field and populated departmentId
    const departmentName = user.department || (user.departmentId?.name) || 'Not Assigned';
    addField('Department', departmentName);
    
    // Position
    const position = user.position || 'Not Assigned';
    addField('Position', position);
    
    // Employment Type - properly formatted
    const employmentType = user.employmentType 
      ? user.employmentType.charAt(0).toUpperCase() + user.employmentType.slice(1).replace(/-/g, ' ') 
      : 'Not Set';
    addField('Employment Type', employmentType);
    
    // Join Date
    addField('Join Date', formatDate(user.joinDate));

    // Manager - only show if user has a manager
    if (user.managerId && (typeof user.managerId === 'object' ? user.managerId.name : user.managerId)) {
      const managerName = typeof user.managerId === 'object' ? user.managerId.name : 'Manager';
      addField('Manager', managerName);
    } else if (user.role === 'employee' || user.role === 'manager') {
      addField('Manager', 'Not Assigned');
    }

    doc.moveDown(0.5);

    // Salary Information Section (for employees and managers only)
    if (user.role === 'employee' || user.role === 'manager') {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Salary Information', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(11);

      // Always show salary field for employees and managers (even if 0 or null)
      addField('Monthly Salary', formatCurrency(user.baseSalary), true);

      // Currency
      const currency = user.currency || 'PKR';
      addField('Currency', currency);

      doc.moveDown(0.5);
    }

    // Contact Information Section - always show section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Contact Information', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(11);

    // Phone - always show field
    addField('Phone', user.phone || 'Not Provided');

    // Address - check if it's an object or string
    let addressText = 'Not Provided';
    if (user.address) {
      if (typeof user.address === 'string') {
        addressText = user.address;
      } else if (typeof user.address === 'object') {
        const addressParts = [];
        if (user.address.street) addressParts.push(user.address.street);
        if (user.address.city) addressParts.push(user.address.city);
        if (user.address.state) addressParts.push(user.address.state);
        if (user.address.zipCode) addressParts.push(user.address.zipCode);
        if (user.address.country) addressParts.push(user.address.country);
        addressText = addressParts.length > 0 ? addressParts.join(', ') : 'Not Provided';
      }
    }
    addField('Address', addressText);

    // Emergency Contact - always show field
    let emergencyText = 'Not Provided';
    if (user.emergencyContact && typeof user.emergencyContact === 'object') {
      const parts = [];
      if (user.emergencyContact.name) parts.push(user.emergencyContact.name);
      if (user.emergencyContact.relationship) parts.push(`(${user.emergencyContact.relationship})`);
      if (user.emergencyContact.phone) parts.push(user.emergencyContact.phone);
      emergencyText = parts.length > 0 ? parts.join(' ') : 'Not Provided';
    }
    addField('Emergency Contact', emergencyText);

    doc.moveDown(0.5);

    // Skills Section - only show if skills exist
    if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      const skillsList = user.skills.filter(skill => skill && skill.trim() !== '');
      if (skillsList.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Skills', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica')
           .text(skillsList.join(', '), { align: 'left' });
        
        doc.moveDown();
      }
    }

    // Footer
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#666666')
       .text('This is a confidential document generated by the MeeTech Labs Management system.', 50, doc.page.height - 100, {
         align: 'center',
         width: doc.page.width - 100
       });

    // Finalize PDF
    doc.end();

    // Audit log (non-blocking)
    try {
      await logUserAction(req, 'read', 'User', user._id, {
        action: 'download_profile_pdf',
        downloadedBy: req.user._id
      });
    } catch (auditError) {
      console.warn('Failed to log profile PDF download:', auditError.message);
    }

  } catch (error) {
    // Handle connection errors
    if (error.name === 'MongoServerSelectionError' || 
        error.name === 'MongoNetworkError' ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return next(new AppError(
        'Database service is temporarily unavailable. Please try again later.',
        503
      ));
    }

    if (error.isOperational || error.statusCode) {
      return next(error);
    }

    console.error('Profile PDF generation error:', error);
    return next(new AppError(
      'Failed to generate profile PDF. Please try again later.',
      500
    ));
  }
};

