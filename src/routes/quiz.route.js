const express = require('express');
const router = express.Router();
const controller = require('../controllers/quiz.controller');
const { requireFields } = require('../middleware/validate');

router.post('/', requireFields(['news_id', 'content']), controller.handle);

module.exports = router;
