const express = require('express');
const cipherController = require('../controllers/cipherController');
const decipherController = require('../controllers/decipherController');
const mainController = require('../controllers/mainController');

const router = express.Router();

router.get('/', mainController.showHomePage);
router.post('/cifrar', cipherController.encryptText);
router.post('/descifrar', decipherController.decryptText);

module.exports = router;
