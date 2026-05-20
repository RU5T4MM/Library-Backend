const Notification = require('../models/Notification');

// @desc    Get notifications for logged-in user (or admin)
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? { forAdmin: true }
            : { userId: req.user.id, forAdmin: false };

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

        res.status(200).json({ success: true, data: notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Mark one notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? { forAdmin: true }
            : { userId: req.user.id, forAdmin: false };

        await Notification.updateMany({ ...query, isRead: false }, { isRead: true });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete one notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteOne = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/delete-all
// @access  Private
exports.deleteAll = async (req, res) => {
    try {
        const query = req.user.role === 'admin'
            ? { forAdmin: true }
            : { userId: req.user.id, forAdmin: false };

        await Notification.deleteMany(query);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
