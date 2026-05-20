const express = require('express');
const { getStats, getRequests, updateRequest, getUsers, freeSeat, deleteUser, updateUser, registerAdmin, getAdmins, deleteAdmin } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/requests', getRequests);
router.put('/requests/:id', updateRequest);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/seats/:id/free', freeSeat);
router.post('/register', registerAdmin);
router.get('/admins', getAdmins);
router.delete('/admins/:id', deleteAdmin);

module.exports = router;
