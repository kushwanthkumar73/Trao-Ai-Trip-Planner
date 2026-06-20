const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  generateNewTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  addActivity,
  removeActivity,
  regenerateDay
} = require('../controllers/tripController');

// All trip routes require authentication
router.use(authMiddleware);

router.post('/generate', generateNewTrip);
router.get('/', getUserTrips);
router.get('/:id', getTripById);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);
router.post('/:id/activity', addActivity);
router.delete('/:id/activity', removeActivity);
router.post('/:id/regenerate-day', regenerateDay);

module.exports = router;
