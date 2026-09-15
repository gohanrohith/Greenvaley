const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mainController');
const schCtrl = require('../controllers/scholarshipController');
const { formLimiter } = require('../middleware/rateLimiter');
const { csrfProtect } = require('../middleware/csrf');

// Public pages
router.get('/',            ctrl.home);
router.get('/about',       ctrl.about);
router.get('/programs',    ctrl.programs);
router.get('/admissions',  ctrl.admissions);
router.get('/faculty',     ctrl.faculty);
router.get('/gallery',     ctrl.gallery);
router.get('/events',      ctrl.events);
router.get('/news',        ctrl.news);
router.get('/news/:slug',  ctrl.newsArticle);
router.get('/contact',     ctrl.contact);
router.post('/contact',    formLimiter, csrfProtect, ctrl.contactSubmit);

// Mandatory disclosure (TSBIE requirement)
router.get('/mandatory-disclosure', ctrl.mandatoryDisclosure);

// Results lookup
router.get('/results',        ctrl.resultsPage);
router.post('/results/check', formLimiter, ctrl.checkResult);

// Sample question papers
router.get('/question-papers', ctrl.questionPapers);

// Scholarship portal
router.get('/scholarship',             schCtrl.portal);
router.get('/scholarship/apply',       schCtrl.applyForm);
router.post('/scholarship/apply',      formLimiter, csrfProtect, schCtrl.applySubmit);
router.get('/scholarship/status',      schCtrl.statusForm);
router.post('/scholarship/status',     formLimiter, schCtrl.checkStatus);

// Utility
router.get('/sitemap.xml', ctrl.sitemap);
router.get('/robots.txt',  ctrl.robots);

module.exports = router;
