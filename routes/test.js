const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/testController');
const { csrfProtect } = require('../middleware/csrf');

router.get('/',          ctrl.testPage);
router.get('/register',  ctrl.registerPage);
router.post('/register', csrfProtect, ctrl.registerSubmit);
router.post('/answer',   ctrl.saveAnswer);   // AJAX — uses X-CSRF-Token header
router.post('/submit',   csrfProtect, ctrl.submitTest);
router.get('/results',   ctrl.resultsPage);
router.get('/recover',   ctrl.recoverPage);
router.post('/recover',  csrfProtect, ctrl.recoverSubmit);

module.exports = router;
