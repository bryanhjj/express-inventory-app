var express = require('express');
var router = express.Router();

// Require controller modules.
var grade_controller = require('../controllers/gradeController');
var series_controller = require('../controllers/seriesController');
var modelKits_controller = require('../controllers/modelKitsController');

/// MODEL KITS ROUTES ///

// GET catalog home page.
router.get('/', modelKits_controller.index);

// GET request for creating a model kit.
router.get('/modelkits/create', modelKits_controller.modelKits_create_get);

// POST request for creating a model kit.
router.post('/modelkits/create', modelKits_controller.modelKits_create_post);

// GET request to delete a model kit.
router.get('/modelkits/:id/delete', modelKits_controller.modelKits_delete_get);

// POST request to delete a model kit.
router.post('/modelkits/:id/delete', modelKits_controller.modelKits_delete_post);

// GET request to update a model kit details.
router.get('/modelkits/:id/update', modelKits_controller.modelKits_update_get);

// POST request to update a model kit details.
router.post('/modelkits/:id/update', modelKits_controller.modelKits_update_post);

// GET request for one model kit.
router.get('/modelkits/:id', modelKits_controller.modelKits_detail);

// GET request for list of all Book items.
router.get('/modelkits', modelKits_controller.modelKits_list);

/// SERIES ROUTES ///

// GET request for creating a new Series. NOTE This must come before route for id.
router.get('/series/create', series_controller.series_create_get);

// POST request for creating a new Series.
router.post('/series/create', series_controller.series_create_post);

// GET request to delete a series.
router.get('/series/:id/delete', series_controller.series_delete_get);

// POST request to delete a series.
router.post('/series/:id/delete', series_controller.series_delete_post);

// GET request to update a series's details.
router.get('/series/:id/update', series_controller.series_update_get);

// POST request to update a series's details.
router.post('/series/:id/update', series_controller.series_update_post);

// GET request for a series.
router.get('/series/:id', series_controller.series_detail);

// GET request for list of all Authors.
router.get('/series', series_controller.series_list);

/// GRADES ROUTES ///

// GET request for creating a Grade. NOTE This must come before route that displays Grades (uses id).
router.get('/grades/create', grade_controller.grade_create_get);

//POST request for creating Grade.
router.post('/grades/create', grade_controller.grade_create_post);

// GET request to delete Grade.
router.get('/grade/:id/delete', grade_controller.grade_delete_get);

// POST request to delete Grade.
router.post('/grade/:id/delete', grade_controller.grade_delete_post);

// GET request to update Grade.
router.get('/grade/:id/update', grade_controller.grade_update_get);

// POST request to update Grade.
router.post('/grade/:id/update', grade_controller.grade_update_post);

// GET request for one Grade.
router.get('/grade/:id', grade_controller.grade_detail);

// GET request for list of all Grade.
router.get('/grades', grade_controller.grade_list);


module.exports = router;