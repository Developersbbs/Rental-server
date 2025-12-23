const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const {
    createAccessoryInward,
    getAllAccessoryInwards
} = require('../controllers/accessoryInwardController');

router.post('/', protect, createAccessoryInward);
router.get('/', protect, getAllAccessoryInwards);

module.exports = router;
