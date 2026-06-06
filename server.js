const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const User = require('./models/User');

// Load env vars
dotenv.config();

const ensureAdminUser = async () => {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return;
        }

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const adminName = process.env.ADMIN_NAME || 'Library Admin';
        const adminMobile = process.env.ADMIN_MOBILE || '0000000000';
        const adminAddress = process.env.ADMIN_ADDRESS || 'Admin';

        await User.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            mobile: adminMobile,
            address: adminAddress,
            aadhaarPhoto: 'no-aadhaar.jpg',
            role: 'admin'
        });

        console.log(`Admin account seeded: email=${adminEmail} password=${adminPassword}`);
    } catch (err) {
        console.error('Failed to seed admin account:', err.message);
    }
};

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173',
        'https://library-frontend-beige-rho.vercel.app',
        'https://library-frontend-ashy-psi.vercel.app'
    ],
    credentials: true
}));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Route files
const auth = require('./routes/authRoutes');
const seats = require('./routes/seatRoutes');
const admin = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startCronJobs } = require('./services/cronJobs');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/seats', seats);
app.use('/api/admin', admin);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Start cron jobs
startCronJobs();

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        await ensureAdminUser();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();
