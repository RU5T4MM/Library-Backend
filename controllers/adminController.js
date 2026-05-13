const User = require('../models/User');
const Seat = require('../models/Seat');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeMembers = await User.countDocuments({ membershipExpiryDate: { $gt: Date.now() } });
        const availableSeats = await Seat.countDocuments({ status: 'available' });
        const bookedSeats = await Seat.countDocuments({ status: 'booked' });
        const pendingRequests = await Payment.countDocuments({ status: 'pending' });

        // Calculate total revenue from approved payments
        const approvedPayments = await Payment.find({ status: 'approved' });
        const totalRevenue = approvedPayments.reduce((acc, curr) => acc + curr.amount, 0);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeMembers,
                availableSeats,
                bookedSeats,
                pendingRequests,
                totalRevenue
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all booking requests
// @route   GET /api/admin/requests
// @access  Admin
exports.getRequests = async (req, res) => {
    try {
        // Get pending payments
        const payments = await Payment.find({ status: 'pending' })
            .populate('userId', 'name email mobile')
            .populate('seatNumber', 'seatNumber')
            .lean();

        // Also find users with pending status who may not have a Payment record
        const pendingUsers = await User.find({ bookingStatus: 'pending', role: 'user' })
            .populate('seatNumber', 'seatNumber')
            .select('-password')
            .lean();

        // Build a set of userIds already covered by payments
        const coveredUserIds = new Set(payments.map(p => p.userId?._id?.toString()));

        // For pending users not in payments, create synthetic request objects
        const syntheticRequests = [];
        for (const u of pendingUsers) {
            if (!coveredUserIds.has(u._id.toString())) {
                // Find their latest payment record regardless of status
                const latestPayment = await Payment.findOne({ userId: u._id })
                    .populate('seatNumber', 'seatNumber')
                    .sort({ createdAt: -1 })
                    .lean();
                if (latestPayment) {
                    latestPayment.userId = { _id: u._id, name: u.name, email: u.email, mobile: u.mobile };
                    syntheticRequests.push(latestPayment);
                }
            }
        }

        const allRequests = [...payments, ...syntheticRequests];
        res.status(200).json({ success: true, count: allRequests.length, data: allRequests });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Approve or Reject a request
// @route   PUT /api/admin/requests/:id
// @access  Admin
exports.updateRequest = async (req, res) => {
    try {
        const { status } = req.body;
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment request not found' });
        }

        payment.status = status;
        await payment.save();

        if (status === 'approved') {
            await Seat.findByIdAndUpdate(payment.seatNumber, { status: 'booked' });

            let days = payment.plan === '1 Month' ? 30 : 90;
            const startDate = new Date();
            const expiryDate = new Date();
            expiryDate.setDate(startDate.getDate() + days);

            await User.findByIdAndUpdate(payment.userId, {
                seatNumber: payment.seatNumber,
                membershipPlan: payment.plan,
                membershipStartDate: startDate,
                membershipExpiryDate: expiryDate,
                bookingStatus: 'approved'
            });

            // Notify student: approved
            await Notification.create({
                userId: payment.userId,
                type: 'request_approved',
                title: 'Booking Approved! 🎉',
                message: `Your seat booking has been approved. Plan: ${payment.plan}. Enjoy the library!`,
                forAdmin: false
            });

        } else if (status === 'rejected') {
            await Seat.findByIdAndUpdate(payment.seatNumber, {
                status: 'available',
                userId: null
            });
            await User.findByIdAndUpdate(payment.userId, {
                seatNumber: null,
                bookingStatus: 'rejected'
            });

            // Notify student: rejected
            await Notification.create({
                userId: payment.userId,
                type: 'request_rejected',
                title: 'Booking Request Rejected',
                message: 'Your booking request was rejected. Please contact admin or try again with correct payment.',
                forAdmin: false
            });
        }

        res.status(200).json({ success: true, data: payment, message: `Request ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all users with their pending payment id
// @route   GET /api/admin/users
// @access  Admin
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .populate('seatNumber', 'seatNumber status')
            .select('-password')
            .lean();

        // Attach pending paymentId for each user who has bookingStatus pending
        for (const u of users) {
            if (u.bookingStatus === 'pending') {
                const payment = await Payment.findOne({ userId: u._id, status: 'pending' })
                    .populate('seatNumber', 'seatNumber')
                    .lean();
                u.pendingPayment = payment || null;
            }
        }

        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Free up a seat manually
// @route   PUT /api/admin/seats/:id/free
// @access  Admin
exports.freeSeat = async (req, res) => {
    try {
        const seat = await Seat.findById(req.params.id);
        if (!seat) {
            return res.status(404).json({ success: false, error: 'Seat not found' });
        }

        // Find user by seatNumber reference OR by seat.userId (whichever is set)
        const user = await User.findOne({
            $or: [
                { seatNumber: seat._id },
                { _id: seat.userId }
            ]
        });

        if (user) {
            await User.findByIdAndUpdate(user._id, {
                seatNumber: null,
                membershipPlan: 'None',
                membershipStartDate: null,
                membershipExpiryDate: null,
                bookingStatus: 'none'
            });
        }

        seat.status = 'available';
        seat.userId = null;
        await seat.save();

        res.status(200).json({ success: true, message: 'Seat freed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete a student
// @route   DELETE /api/admin/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Free their seat — set back to available so others can book it
        if (user.seatNumber) {
            await Seat.findByIdAndUpdate(user.seatNumber, {
                status: 'available',
                userId: null
            });
        }

        // Also free any pending seat (bookingStatus pending)
        if (user.bookingStatus === 'pending') {
            const pendingPayment = await Payment.findOne({ userId: user._id, status: 'pending' });
            if (pendingPayment) {
                await Seat.findByIdAndUpdate(pendingPayment.seatNumber, {
                    status: 'available',
                    userId: null
                });
                pendingPayment.status = 'rejected';
                await pendingPayment.save();
            }
        }

        await user.deleteOne();

        res.status(200).json({ success: true, message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update a student
// @route   PUT /api/admin/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
    try {
        const { name, email, mobile, address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, mobile, address },
            { new: true, runValidators: true }
        ).populate('seatNumber', 'seatNumber status').select('-password');

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
