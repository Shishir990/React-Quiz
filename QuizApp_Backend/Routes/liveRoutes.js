const express = require('express');
const router = express.Router();
const { protect } = require('../Middleware/authMiddleware');
const { ticket, myGames, getGame } = require('../Controllers/liveController');

router.post('/ticket', protect, ticket);
// Past live games of the signed-in player
router.get('/games', protect, myGames);
router.get('/games/:id', protect, getGame);

module.exports = router;
