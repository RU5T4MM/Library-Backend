const express = require('express');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', upload.single('image'), uploadToCloudinary, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Please upload a file' });
    }
    
    res.status(200).json({
        success: true,
        data: req.file.cloudinaryUrl
    });
});

module.exports = router;
