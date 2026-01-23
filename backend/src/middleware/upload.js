import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { InvalidInputError } from '../utils/errorHandler.js';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types
const allowedMimeTypes = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ],
  all: []
};

// File size limits (in bytes)
const fileSizeLimits = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  default: 10 * 1024 * 1024 // 10MB
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const entityType = req.body.entityType || 'general';
    const entityDir = path.join(uploadsDir, entityType);
    
    if (!fs.existsSync(entityDir)) {
      fs.mkdirSync(entityDir, { recursive: true });
    }
    
    cb(null, entityDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = req.body.allowedTypes || 'all';
  let validMimeTypes = [];

  if (allowedTypes === 'images') {
    validMimeTypes = allowedMimeTypes.images;
  } else if (allowedTypes === 'documents') {
    validMimeTypes = allowedMimeTypes.documents;
  } else {
    validMimeTypes = [...allowedMimeTypes.images, ...allowedMimeTypes.documents];
  }

  if (validMimeTypes.length === 0 || validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new InvalidInputError(`File type ${file.mimetype} is not allowed. Allowed types: ${validMimeTypes.join(', ')}`), false);
  }
};

// Get file size limit based on file type
const getFileSizeLimit = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return fileSizeLimits.image;
  }
  if (allowedMimeTypes.documents.includes(mimetype)) {
    return fileSizeLimits.document;
  }
  return fileSizeLimits.default;
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: fileSizeLimits.default,
    files: 10 // Max 10 files at once
  }
});

// Custom middleware for profile photo upload
export const uploadProfilePhoto = () => {
  // Configure storage specifically for profile photos
  const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const profileDir = path.join(uploadsDir, 'profiles');
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }
      cb(null, profileDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      // Use user ID if available, otherwise use timestamp-based name
      const userId = req.user?._id?.toString() || req.user?.id?.toString() || 'user';
      const sanitizedName = `profile-${userId}-${uniqueSuffix}${ext}`;
      cb(null, sanitizedName);
    }
  });

  // Profile photo file filter - only images
  const profileFileFilter = (req, file, cb) => {
    if (allowedMimeTypes.images.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new InvalidInputError(`Only image files are allowed. Allowed types: ${allowedMimeTypes.images.join(', ')}`), false);
    }
  };

  const profileUpload = multer({
    storage: profileStorage,
    fileFilter: profileFileFilter,
    limits: {
      fileSize: fileSizeLimits.image, // 5MB for profile photos
      files: 1
    }
  });

  return (req, res, next) => {
    // Ensure user is authenticated before upload (should be checked by auth middleware, but double-check)
    if (!req.user || !req.user._id) {
      return next(new InvalidInputError('Authentication required to upload profile photo'));
    }
    
    const uploadMiddleware = profileUpload.single('photo');
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InvalidInputError(`Profile photo size exceeds the limit of ${fileSizeLimits.image / (1024 * 1024)}MB. Maximum size is 5MB.`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new InvalidInputError('Only one profile photo can be uploaded at a time'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new InvalidInputError('Unexpected file field. Please use "photo" as the field name.'));
        }
        return next(new InvalidInputError(`Upload error: ${err.message}`));
      }
      
      if (err) {
        // If it's an InvalidInputError from fileFilter, return it directly
        if (err instanceof InvalidInputError || err.isOperational) {
          return next(err);
        }
        // For other errors, provide user-friendly message
        if (process.env.NODE_ENV === 'production') {
          return next(new InvalidInputError('Failed to process uploaded file. Please try again.'));
        }
        return next(err);
      }

      // Additional validation if file was uploaded
      if (req.file) {
        const fileSizeLimit = fileSizeLimits.image;
        if (req.file.size > fileSizeLimit) {
          // Delete the uploaded file
          if (fs.existsSync(req.file.path)) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (deleteError) {
              console.warn('Failed to delete oversized file:', deleteError.message);
            }
          }
          return next(new InvalidInputError(`Profile photo size exceeds the limit of ${fileSizeLimit / (1024 * 1024)}MB. Maximum size is 5MB.`));
        }
        
        // Validate it's actually an image file by extension
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (!allowedExts.includes(ext)) {
          // Delete the invalid file
          if (fs.existsSync(req.file.path)) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (deleteError) {
              console.warn('Failed to delete invalid file:', deleteError.message);
            }
          }
          return next(new InvalidInputError(`Invalid file type. Only ${allowedExts.join(', ')} image files are allowed.`));
        }
        
        // Validate file exists and is readable
        if (!fs.existsSync(req.file.path)) {
          return next(new InvalidInputError('Uploaded file was not saved correctly. Please try again.'));
        }
        
        // Validate mime type matches extension
        const mimeTypeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        const expectedMimeType = mimeTypeMap[ext];
        if (expectedMimeType && !req.file.mimetype.includes(expectedMimeType.split('/')[1])) {
          // Log warning but don't fail - mime types can be inconsistent
          console.warn(`Mime type mismatch: ${req.file.mimetype} vs expected ${expectedMimeType} for extension ${ext}`);
        }
      } else {
        // No file uploaded but request passed authentication
        return next(new InvalidInputError('No photo file provided. Please select an image file to upload.'));
      }

      next();
    });
  };
};

// Custom middleware for single file upload with validation
export const uploadSingle = (fieldName = 'file', options = {}) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InvalidInputError(`File size exceeds the limit of ${fileSizeLimits.default / (1024 * 1024)}MB`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new InvalidInputError('Too many files uploaded'));
        }
        return next(new InvalidInputError(err.message));
      }
      
      if (err) {
        return next(err);
      }

      // Additional validation
      if (req.file) {
        const fileSizeLimit = getFileSizeLimit(req.file.mimetype);
        if (req.file.size > fileSizeLimit) {
          // Delete the uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return next(new InvalidInputError(`File size exceeds the limit of ${fileSizeLimit / (1024 * 1024)}MB`));
        }
      }

      next();
    });
  };
};

// Custom middleware for multiple file upload
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new InvalidInputError(`File size exceeds the limit of ${fileSizeLimits.default / (1024 * 1024)}MB`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new InvalidInputError(`Too many files. Maximum ${maxCount} files allowed`));
        }
        return next(new InvalidInputError(err.message));
      }
      
      if (err) {
        return next(err);
      }

      // Additional validation for each file
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileSizeLimit = getFileSizeLimit(file.mimetype);
          if (file.size > fileSizeLimit) {
            // Delete all uploaded files
            req.files.forEach(f => {
              if (fs.existsSync(f.path)) {
                fs.unlinkSync(f.path);
              }
            });
            return next(new InvalidInputError(`File ${file.originalname} size exceeds the limit of ${fileSizeLimit / (1024 * 1024)}MB`));
          }
        }
      }

      next();
    });
  };
};

export { allowedMimeTypes, fileSizeLimits };

