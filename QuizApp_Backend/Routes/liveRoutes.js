const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { ticket } = require('../Controllers/liveController');

router.post('/ticket', protect, ticket);

module.exports = router;
