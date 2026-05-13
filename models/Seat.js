const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
    seatNumber: {
        type: Number,
        required: true,
        unique: true,
        min: 1,
        max: 35
    },
    status: {
        type: String,
        enum: ['available', 'booked', 'pending'],
        default: 'available'
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema);
