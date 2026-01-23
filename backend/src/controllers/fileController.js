import {
  uploadToStorage,
  deleteFromStorage,
  getFileUrl,
  getFileMetadata,
  getFilesByEntity,
  generatePDF
} from '../services/fileService.js';
import { sendSuccess } from '../utils/responseHandler.js';
import { logUserAction } from '../utils/auditLogger.js';
import { ensureMongoConnected, executeWithRetry } from '../utils/dbUtils.js';
import fs from 'fs';
import path from 'path';
import { ResourceNotFoundError, InvalidInputError, AppError } from '../utils/errorHandler.js';

export const uploadFile = async (req, res, next) => {
  let uploadedFile = null;
  
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

    if (!req.file) {
      return next(new InvalidInputError('No file uploaded. Please select a file to upload.'));
    }

    uploadedFile = req.file;

    // Validate file exists and has content
    if (!fs.existsSync(uploadedFile.path)) {
      return next(new InvalidInputError('Uploaded file was not saved correctly. Please try again.'));
    }

    if (uploadedFile.size === 0) {
      // Clean up empty file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return next(new InvalidInputError('Uploaded file is empty. Please select a valid file.'));
    }

    const {
      entityType,
      entityId,
      description,
      tags,
      category,
      isPublic,
      accessRoles,
      accessUsers
    } = req.body;

    // Validate required fields
    if (!entityType || !entityId) {
      // Clean up uploaded file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return next(new InvalidInputError('Entity type and entity ID are required'));
    }

    // For employee documents, ensure entityId matches the employee
    if (entityType === 'employee_document') {
      // If employee is uploading their own document, ensure entityId matches their user ID
      if (req.user.role === 'employee' && entityId !== req.user._id.toString()) {
        // Clean up uploaded file
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
        return next(new InvalidInputError('You can only upload documents for your own profile'));
      }
    }

    // Parse JSON fields safely
    let parsedTags = [];
    let parsedAccessRoles = [];
    let parsedAccessUsers = [];

    try {
      if (tags) {
        const tagsData = typeof tags === 'string' ? JSON.parse(tags) : tags;
        parsedTags = Array.isArray(tagsData) ? tagsData : [tagsData];
      }
    } catch (e) {
      console.warn('Failed to parse tags:', e.message);
    }

    try {
      if (accessRoles) {
        const rolesData = typeof accessRoles === 'string' ? JSON.parse(accessRoles) : accessRoles;
        parsedAccessRoles = Array.isArray(rolesData) ? rolesData : [rolesData];
      }
    } catch (e) {
      console.warn('Failed to parse accessRoles:', e.message);
    }

    try {
      if (accessUsers) {
        const usersData = typeof accessUsers === 'string' ? JSON.parse(accessUsers) : accessUsers;
        parsedAccessUsers = Array.isArray(usersData) ? usersData : [usersData];
      }
    } catch (e) {
      console.warn('Failed to parse accessUsers:', e.message);
    }

    // For employee documents, automatically grant access to admin and manager roles
    if (entityType === 'employee_document') {
      if (!parsedAccessRoles.includes('admin')) {
        parsedAccessRoles.push('admin');
      }
      if (!parsedAccessRoles.includes('manager')) {
        parsedAccessRoles.push('manager');
      }
    }

    const metadata = {
      entityType,
      entityId,
      uploadedBy: req.user._id,
      description: description || '',
      tags: parsedTags,
      category: category || '',
      isPublic: isPublic === 'true' || isPublic === true,
      accessRoles: parsedAccessRoles,
      accessUsers: parsedAccessUsers
    };

    const fileAttachment = await executeWithRetry(async () => {
      return await uploadToStorage(uploadedFile, metadata);
    });

    // Audit log (non-blocking)
    try {
      await logUserAction(req, 'create', 'FileAttachment', fileAttachment._id, {
        action: 'upload_file',
        fileName: fileAttachment.originalFileName,
        entityType: fileAttachment.entityType,
        entityId: fileAttachment.entityId
      });
    } catch (auditError) {
      console.warn('Failed to log file upload:', auditError.message);
    }

    return sendSuccess(res, 201, 'File uploaded successfully', { file: fileAttachment });
  } catch (error) {
    // Clean up uploaded file on error
    if (uploadedFile && fs.existsSync(uploadedFile.path)) {
      try {
        fs.unlinkSync(uploadedFile.path);
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

    next(error);
  }
};

export const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const fileMetadata = await getFileMetadata(id, userId, userRole);

    return sendSuccess(res, 200, 'File metadata retrieved successfully', { file: fileMetadata });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const fileInfo = await getFileUrl(id, userId, userRole);
    const fileAttachment = await getFileMetadata(id, userId, userRole);

    if (!fileAttachment.filePath || !fs.existsSync(fileAttachment.filePath)) {
      throw new ResourceNotFoundError('File not found on server');
    }

    logUserAction(req, 'read', 'FileAttachment', id, {
      action: 'download_file',
      fileName: fileAttachment.originalFileName
    });

    res.setHeader('Content-Disposition', `attachment; filename="${fileAttachment.originalFileName}"`);
    res.setHeader('Content-Type', fileAttachment.fileType);

    const fileStream = fs.createReadStream(fileAttachment.filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
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

    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const result = await executeWithRetry(async () => {
      return await deleteFromStorage(id, userId, userRole);
    });

    // Audit log (non-blocking)
    try {
      await logUserAction(req, 'delete', 'FileAttachment', id, {
        action: 'delete_file',
        deletedBy: userId.toString(),
        userRole: userRole
      });
    } catch (auditError) {
      console.warn('Failed to log file deletion:', auditError.message);
    }

    return sendSuccess(res, 200, result.message);
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
        'Failed to delete file. Please try again later.',
        500
      ));
    }

    next(error);
  }
};

export const getFilesByEntityEndpoint = async (req, res, next) => {
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

    const { entityType, entityId } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!entityType || !entityId) {
      return next(new InvalidInputError('Entity type and entity ID are required'));
    }

    const files = await executeWithRetry(async () => {
      return await getFilesByEntity(entityType, entityId, userId, userRole);
    });

    return sendSuccess(res, 200, 'Files retrieved successfully', { files });
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
        'Failed to retrieve files. Please try again later.',
        500
      ));
    }

    next(error);
  }
};

export const generatePDFEndpoint = async (req, res, next) => {
  try {
    const { data, filename, content } = req.body;

    const pdfResult = await generatePDF(data, { filename, content });

    return sendSuccess(res, 200, 'PDF generated successfully', pdfResult);
  } catch (error) {
    next(error);
  }
};

