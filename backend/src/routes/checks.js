const express = require('express');
const { checkFuel } = require('../services/checks');

const router = express.Router();

router.post('/check-fuel', async (req, res) => {
  try {
    res.json(await checkFuel());
  } catch (error) {
    console.error('Error checking fuel:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
