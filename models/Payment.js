const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    seatNumber: {
        type: mongoose.Schema.ObjectId,
        ref: 'Seat',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    plan: {
        type: String,
        required: true
    },
    paymentScreenshot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
