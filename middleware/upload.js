const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (req, res, next) => {
    if (!req.file) return next();

    const stream = cloudinary.uploader.upload_stream(
        { folder: 'infotech_library', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
        (error, result) => {
            if (error) return next(error);
            req.file.cloudinaryUrl = result.secure_url;
            req.file.cloudinaryPublicId = result.public_id;
            next();
        }
    );

    Readable.from(req.file.buffer).pipe(stream);
};

module.exports = { upload, uploadToCloudinary };
