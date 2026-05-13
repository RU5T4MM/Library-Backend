const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Seat = require('./models/Seat');

dotenv.config();

mongoose.connect(process.env.MONGO_URL).then(async () => {
    console.log('MongoDB connected.');
    
    const count = await Seat.countDocuments();
    if (count === 0) {
        console.log('No seats found. Initializing 35 seats...');
        const seats = [];
        for (let i = 1; i <= 35; i++) {
            seats.push({
                seatNumber: i,
                status: 'available'
            });
        }
        await Seat.insertMany(seats);
        console.log('Successfully added 35 seats to the database.');
    } else {
        console.log(`Database already has ${count} seats. No action needed.`);
    }

    process.exit(0);
}).catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
});
