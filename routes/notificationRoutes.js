const express = require('express');
const { getNotifications, markRead, markAllRead, deleteOne, deleteAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/delete-all', deleteAll);
router.delete('/:id', deleteOne);

module.exports = router;
