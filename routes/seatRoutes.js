const express = require('express');
const { initSeats, getSeats, requestSeat } = require('../controllers/seatController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getSeats);
router.post('/init', protect, authorize('admin'), initSeats);
router.post('/request', protect, requestSeat);

module.exports = router;
