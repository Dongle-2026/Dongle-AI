const express = require('express');
const router = express.Router();
const controller = require('../controllers/embed.controller');
const { requireFields } = require('../middleware/validate');

router.post('/', requireFields(['source_type', 'source_id', 'text']), controller.handle);

module.exports = router;
