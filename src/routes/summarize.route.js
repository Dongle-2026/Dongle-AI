const express = require('express');
const router = express.Router();
const controller = require('../controllers/summarize.controller');
const { requireFields } = require('../middleware/validate');

router.post('/', requireFields(['news_id', 'title', 'content']), controller.handle);

module.exports = router;
