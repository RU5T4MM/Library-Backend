const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // null = admin notification, userId = student notification
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    type: {
        type: String,
        enum: ['expiry_warning', 'expired', 'new_request', 'request_approved', 'request_rejected'],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    forAdmin: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
