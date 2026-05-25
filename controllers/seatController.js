const Seat = require('../models/Seat');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// @desc    Initialize 35 seats (Run once)
// @route   POST /api/seats/init
// @access  Admin
exports.initSeats = async (req, res) => {
    try {
        const count = await Seat.countDocuments();
        if (count > 0) {
            return res.status(400).json({ success: false, error: 'Seats already initialized' });
        }

        const seats = [];
        for (let i = 1; i <= 35; i++) {
            seats.push({ seatNumber: i });
        }

        await Seat.insertMany(seats);

        res.status(201).json({ success: true, count: seats.length, data: seats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all seats
// @route   GET /api/seats
// @access  Public
exports.getSeats = async (req, res) => {
    try {
        const seats = await Seat.find().sort({ seatNumber: 1 }).populate('userId', 'name');
        res.status(200).json({ success: true, count: seats.length, data: seats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Request a seat (Booking)
// @route   POST /api/seats/request
// @access  Private
exports.requestSeat = async (req, res) => {
    try {
        let { seatNumber, plan, amount, paymentScreenshot } = req.body;

        if (plan === '3 Days Demo') {
            amount = 0;
            paymentScreenshot = 'demo_no_payment_required';
        }

        if (!seatNumber || !plan || amount === undefined || amount === null || !paymentScreenshot) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (req.user.bookingStatus === 'approved' && req.user.membershipExpiryDate && new Date(req.user.membershipExpiryDate) > new Date()) {
            return res.status(400).json({ success: false, error: 'You already have an active membership' });
        }

        if (req.user.bookingStatus === 'pending') {
            return res.status(400).json({ success: false, error: 'You already have a pending request' });
        }

        const seat = await Seat.findOne({ seatNumber });
        if (!seat) {
            return res.status(404).json({ success: false, error: 'Seat not found' });
        }
        if (seat.status !== 'available') {
            return res.status(400).json({ success: false, error: `Seat is currently ${seat.status}` });
        }

        // Create Payment FIRST — if this fails, nothing else gets updated
        const payment = await Payment.create({
            userId: req.user.id,
            seatNumber: seat._id,
            amount,
            plan,
            paymentScreenshot
        });

        // Only update Seat and User after Payment is successfully created
        seat.status = 'pending';
        seat.userId = req.user.id;
        await seat.save();

        await User.findByIdAndUpdate(req.user.id, { bookingStatus: 'pending' });

        // Notify admin about new booking request with payment proof screenshot
        await Notification.create({
            type: 'new_request',
            title: 'New Booking Request',
            message: `${req.user.name} has submitted a booking request for Seat #${seat.seatNumber} (${plan} - ₹${amount}). Review the payment proof to approve.`,
            forAdmin: true,
            paymentScreenshot,
            paymentId: payment._id,
            seatNumber: seat.seatNumber,
            amount
        });

        res.status(200).json({ success: true, data: payment, message: 'Request submitted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
