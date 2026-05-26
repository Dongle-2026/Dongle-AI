const express = require('express');
const router = express.Router();
const controller = require('../controllers/chat.controller');
const { requireFields } = require('../middleware/validate');

router.post('/', requireFields(['user_id', 'session_id', 'message']), controller.handle);

module.exports = router;
