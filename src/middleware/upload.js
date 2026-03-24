const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (some browsers send this for .docx)
]);

const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

const fileFilter = (req, file, cb) => {
  const ext = file.originalname
    ? '.' + file.originalname.split('.').pop().toLowerCase()
    : '';

  if (ALLOWED_MIMETYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Only PDF and DOCX files are accepted. Received: ${file.originalname || file.mimetype}`
      ),
      false
    );
  }
};

const limits = {
  fileSize: 10 * 1024 * 1024, // raised to 10MB — DOCX files can be larger
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
