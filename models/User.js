const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    mobile: {
        type: String,
        required: [true, 'Please add a mobile number']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    profilePhoto: {
        type: String,
        default: 'no-photo.jpg'
    },
    aadhaarPhoto: {
        type: String,
        required: [true, 'Please add an Aadhaar card photo']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    seatNumber: {
        type: mongoose.Schema.ObjectId,
        ref: 'Seat',
        default: null
    },
    membershipPlan: {
        type: String,
        enum: ['None', '1 Month', '3 Months'],
        default: 'None'
    },
    membershipStartDate: {
        type: Date,
        default: null
    },
    membershipExpiryDate: {
        type: Date,
        default: null
    },
    bookingStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    }
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
