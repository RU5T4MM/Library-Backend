const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper to create notification if not already exists today
const createIfNotExists = async (data) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const exists = await Notification.findOne({
        userId: data.userId || null,
        forAdmin: data.forAdmin || false,
        type: data.type,
        createdAt: { $gte: todayStart }
    });

    if (!exists) {
        await Notification.create(data);
    }
};

const checkExpiryNotifications = async () => {
    try {
        const now = new Date();
        const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        // Students whose membership expires within 5 days
        const expiringSoon = await User.find({
            role: 'user',
            bookingStatus: 'approved',
            membershipExpiryDate: { $gte: now, $lte: in5Days }
        });

        for (const student of expiringSoon) {
            const daysLeft = Math.ceil((new Date(student.membershipExpiryDate) - now) / (1000 * 60 * 60 * 24));

            // Notify student
            await createIfNotExists({
                userId: student._id,
                type: 'expiry_warning',
                title: 'Membership Expiring Soon',
                message: `Your membership expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please renew to keep your seat.`,
                forAdmin: false
            });

            // Notify admin
            await createIfNotExists({
                userId: student._id,
                type: 'expiry_warning',
                title: 'Student Membership Expiring',
                message: `${student.name}'s membership expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (Seat #${student.seatNumber || 'N/A'}).`,
                forAdmin: true
            });
        }

        // Students whose membership has already expired
        const expired = await User.find({
            role: 'user',
            bookingStatus: 'approved',
            membershipExpiryDate: { $lt: now }
        });

        for (const student of expired) {
            // Notify student
            await createIfNotExists({
                userId: student._id,
                type: 'expired',
                title: 'Membership Expired',
                message: 'Your membership has expired. Please renew your payment to continue using the library.',
                forAdmin: false
            });

            // Notify admin
            await createIfNotExists({
                userId: student._id,
                type: 'expired',
                title: 'Membership Expired',
                message: `${student.name}'s membership has expired. Seat may need to be freed.`,
                forAdmin: true
            });
        }

        console.log(`[Cron] Expiry check done. Expiring: ${expiringSoon.length}, Expired: ${expired.length}`);
    } catch (err) {
        console.error('[Cron] Error:', err.message);
    }
};

// Run every day at 9:00 AM
const startCronJobs = () => {
    cron.schedule('0 9 * * *', checkExpiryNotifications);
    // Also run once on server start to catch any missed notifications
    checkExpiryNotifications();
    console.log('[Cron] Expiry notification job scheduled (daily 9 AM)');
};

module.exports = { startCronJobs, checkExpiryNotifications };
