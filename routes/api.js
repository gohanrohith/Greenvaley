const express = require('express');
const router  = express.Router();
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(apiLimiter);

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

module.exports = router;
