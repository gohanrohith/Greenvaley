const express = require('express');
const router  = express.Router();
const ctrl      = require('../controllers/adminController');
const schCtrl   = require('../controllers/scholarshipController');
const testCtrl  = require('../controllers/adminTestController');
const { requireAdmin, requireSuper } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Auth (no requireAdmin yet)
router.get('/login',  ctrl.loginPage);
router.post('/login', csrfProtect, ctrl.loginSubmit);
router.get('/logout', ctrl.logout);

// All routes below require login
router.use(requireAdmin);
router.use((req, res, next) => {
  if (req.method === 'POST') return csrfProtect(req, res, next);
  next();
});

router.get('/', ctrl.dashboard);

// News/announcements
router.get('/news',               ctrl.newsList);
router.get('/news/new',           ctrl.newsForm);
router.post('/news/new',          ctrl.createNews);
router.get('/news/:id/edit',      ctrl.editNewsForm);
router.post('/news/:id/edit',     ctrl.updateNews);
router.post('/news/:id/delete',   ctrl.deleteNews);

// Events
router.get('/events',             ctrl.eventsList);
router.get('/events/new',         ctrl.eventForm);
router.post('/events/new',        ctrl.createEvent);
router.get('/events/:id/edit',    ctrl.editEventForm);
router.post('/events/:id/edit',   ctrl.updateEvent);
router.post('/events/:id/delete', ctrl.deleteEvent);

// Gallery
router.get('/gallery',                     ctrl.galleryList);
router.get('/gallery/new',                 ctrl.albumForm);
router.post('/gallery/new',                ctrl.createAlbum);
router.get('/gallery/:id/upload',          ctrl.albumUploadForm);
router.post('/gallery/:id/upload',         ctrl.uploadPhotos);
router.post('/gallery/:id/delete',         ctrl.deleteAlbum);
router.post('/gallery/:id/reorder',        ctrl.reorderPhotos);
router.post('/gallery/photo/:id/move',     ctrl.movePhoto);
router.post('/gallery/photo/:id/delete',   ctrl.deletePhoto);

// Question papers
router.get('/question-papers',             ctrl.papersList);
router.get('/question-papers/new',         ctrl.paperForm);
router.post('/question-papers/new',        ctrl.uploadPaper);
router.post('/question-papers/:id/delete', ctrl.deletePaper);

// Exam results
router.get('/results',            ctrl.resultsList);
router.get('/results/new',        ctrl.resultForm);
router.post('/results/new',       ctrl.createResult);
router.get('/results/:id/edit',   ctrl.editResultForm);
router.post('/results/:id/edit',  ctrl.updateResult);
router.post('/results/:id/delete',ctrl.deleteResult);
router.post('/results/import',    ctrl.importResults);

// Toppers / achievements
router.get('/toppers',               ctrl.toppersList);
router.get('/toppers/new',           ctrl.topperForm);
router.post('/toppers/new',          ctrl.createTopper);
router.get('/toppers/:id/edit',      ctrl.editTopperForm);
router.post('/toppers/:id/edit',     ctrl.updateTopper);
router.post('/toppers/:id/delete',   ctrl.deleteTopper);

// Scholarship management
router.get('/scholarship',                         schCtrl.adminList);
router.get('/scholarship/:id',                     schCtrl.adminView);
router.post('/scholarship/:id/status',             schCtrl.updateStatus);
router.post('/scholarship/:id/result',             schCtrl.saveResult);
router.post('/scholarship/:id/delete',             schCtrl.deleteApplication);

// Contact enquiries
router.get('/enquiries',             ctrl.enquiriesList);
router.post('/enquiries/:id/delete', ctrl.deleteEnquiry);

// Mandatory disclosure
router.get('/disclosure',  ctrl.disclosureForm);
router.post('/disclosure', ctrl.saveDisclosure);

// Users (super only)
router.get('/users',             requireSuper, ctrl.usersList);
router.get('/users/new',         requireSuper, ctrl.userForm);
router.post('/users/new',        requireSuper, ctrl.createUser);
router.get('/users/:id/edit',    requireSuper, ctrl.editUserForm);
router.post('/users/:id/edit',   requireSuper, ctrl.updateUser);
router.post('/users/:id/delete', requireSuper, ctrl.deleteUser);

// ── Scholarship Test management ──────────────────────────────────────────────
router.get('/test',                          testCtrl.dashboard);
router.get('/test/questions',                testCtrl.questionsList);
router.get('/test/questions/new',            testCtrl.questionForm);
router.post('/test/questions/new',           testCtrl.createQuestion);
router.get('/test/questions/:id/edit',       testCtrl.editQuestionForm);
router.post('/test/questions/:id/edit',      testCtrl.updateQuestion);
router.post('/test/questions/:id/delete',    testCtrl.deleteQuestion);
router.get('/test/sets',                     testCtrl.setsList);
router.get('/test/sets/new',                 testCtrl.setForm);
router.post('/test/sets/new',                testCtrl.createSet);
router.get('/test/sets/:id/edit',            testCtrl.editSetForm);
router.post('/test/sets/:id/edit',           testCtrl.updateSet);
router.post('/test/sets/:id/toggle',         testCtrl.toggleSet);
router.post('/test/sets/:id/delete',         testCtrl.deleteSet);
router.get('/test/results',                  testCtrl.resultsList);
router.get('/test/results/export',           testCtrl.exportCsv);
router.get('/test/live',                     testCtrl.liveSessions);

// Settings
router.get('/settings',  ctrl.settings);
router.post('/settings', ctrl.saveSettings);

// Own profile
router.get('/profile',  ctrl.profileForm);
router.post('/profile', ctrl.saveProfile);

router.get('/keepalive', (req, res) => { req.session.touch(); res.sendStatus(204); });

module.exports = router;
