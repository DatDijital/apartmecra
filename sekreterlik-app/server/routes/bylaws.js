const express = require('express');
const router = express.Router();
const BylawsController = require('../controllers/BylawsController');

// Fetch bylaws text from URL
router.get('/fetch', BylawsController.fetchBylawsFromUrl);

module.exports = router;

