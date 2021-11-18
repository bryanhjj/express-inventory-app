var ModelKits = require('../models/modelkits');
var Grade = require('../models/grade');
var Series = require('../models/series');
const { body,validationResult } = require("express-validator");

// Image uploading middleware setup
const multer  = require('multer');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './public/images/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
  }
});
const fileFilter = (req, file, cb) => {
  // rejects a file if it's not a jpeg/png
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter,
});

var async = require('async');

// landing home page
exports.index = function(req, res) {

    async.parallel({
        modelkits_count: function(callback) {
            ModelKits.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
        },
        grade_count: function(callback) {
            Grade.countDocuments({}, callback);
        },
        series_count: function(callback) {
            Series.countDocuments({}, callback);
        }
    }, function(err, results) {
        res.render('index', { title: 'Inventory Manager', error: err, data: results });
    });
};

// Display list of all model kits.
exports.modelKits_list = function(req, res, next) {
    ModelKits.find({}, 'name grade price description series')
      .sort({series : 1})
      .populate('series', 'series_name')
      .populate('grade', 'grade_name')
      .exec(function (err, list_modelkits) {
        if (err) { return next(err); }
        //Successful, so render
        res.render('modelkits_list', { title: 'Model Kits List', modelkits_list: list_modelkits });
      });
  };

// Display detail page for a specific model kit.
exports.modelKits_detail = function(req, res) {
    async.parallel({
        modelkit: function(callback) {
            ModelKits.findById(req.params.id)
            .populate('series', 'series_name')
            .populate('grade', 'grade_name')
            .exec(callback);
        },
    },
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.modelkit == null) {
                var err = new Error('Model kit not found');
                err.status = 404;
                return next(err);
            }
            console.log(results);
            res.render('modelkits_detail', {title: results.modelkit.name, model: results.modelkit});
        }
    );
};

// Display model kits create form on GET.
exports.modelKits_create_get = function(req, res) {

    // Grabbing all Grades and Series available for the user to choose while creating a new model kit
    async.parallel({
        grade: function(callback){
            Grade.find(callback);
        },
        series: function(callback){
            Series.find(callback);
        },
    }, function(err, results) {
        if (err) {
            return next(err);
        } else {
            res.render('modelkits_form', {title: 'Create Model Kit', grade: results.grade, series: results.series});
        }
    });
};

// Handle model kits create on POST.
// Updated with image upload feature.
exports.modelKits_create_post = [

    // Middleware for handling the image uploading feature.
    upload.single('model_image'),
    
    // Validate the user input
    body('name', 'Name must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('grade', 'Grade must not be empty.').trim().isLength({ min: 1 }).escape(), // to ref to Grade
    body('price', 'Price must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('description', 'Description must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('series', 'Series must not be empty.').trim().isLength({ min: 1 }).escape(), // to ref to Series
    body('numberInStock', 'Number in stock must not be empty.').trim().isLength({ min: 1 }).escape(),

    // Process the request after validation
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a new ModelKit object with the validated user input
        var modelkit = new ModelKits({
            name: req.body.name,
            grade: req.body.grade,
            price: req.body.price,
            description: req.body.description,
            series: req.body.series,
            numberInStock: req.body.numberInStock,
        });

        if (!errors.isEmpty()) {

            // There are errors, re-render the form again with error messages
            async.parallel({
                grade: function(callback){
                    Grade.find(callback);
                },
                series: function(callback){
                    Series.find(callback);
                },
            }, function(err, results) {
                if (err) {
                    return next(err);
                } else {
                    res.render('modelkits_form', {title: 'Create Model Kit', grade: results.grade, series: results.series, modelkit: modelkit, errors: errors.array()});
                }
            });
            return;
        } else {
            if (!req.hasOwnProperty('file')) {
                // When the users did not upload an image upon model kit object creation
                modelkit.save(function(err) {
                    if (err) {
                        return next(err);
                    } else {
                        res.redirect(modelkit.url);
                    }
                });
            } else {
                // When an image is uploaded upon creation
                modelkit.model_image = req.file.path;
                modelkit.save(function(err) {
                    if (err) {
                        return next(err);
                    } else {
                        res.redirect(modelkit.url);
                    }
                });
            }
        }
    }
];

// Display model kits delete form on GET.
exports.modelKits_delete_get = function(req, res, next) {
    async.parallel({
        model: function(callback) {
            ModelKits.findById(req.params.id)
            .populate('series', 'series_name')
            .populate('grade', 'grade_name')
            .exec(callback);
        },
      }, function(err, results) {
        if (err) {
          return next(err);
        }
        if (results.model==null) { // No results.
            res.redirect('/catalog/modelkits');
        }
        // Successful, so render.
        res.render('modelkit_delete', { title: 'Delete Model Kit', model: results.model } );
      });
};

// Handle model kits delete on POST.
exports.modelKits_delete_post = function(req, res, next) {
    async.parallel({
        model: function(callback) {
            ModelKits.findById(req.params.id)
            .populate('series', 'series_name')
            .populate('grade', 'grade_name')
            .exec(callback);
        },
      }, function(err, results) {
        if (err) { return next(err); }
        // Success
        else {
            // Series has no associated model kits, clear to be deleted
            ModelKits.findByIdAndRemove(req.body.modelid, function deleteModel(err) {
                if (err) {
                  return next(err);
                }
                // Success - redirect to model kits list
                res.redirect('/catalog/modelkits')
            });
        }
    });
};

// Display model kits update form on GET.
exports.modelKits_update_get = function(req, res, next) {

    // Get relevant fields for form.
    async.parallel({
        model: function(callback) {
            ModelKits.findById(req.params.id)
            .populate('series', 'series_name')
            .populate('grade', 'grade_name')
            .exec(callback);
        },
        grade: function(callback) {
            Grade.find(callback);
        },
        series: function(callback) {
            Series.find(callback);
        },
        }, function(err, results) {
            if (err) { return next(err); }
            if (results.model==null) { // No results.
                var err = new Error('Model kit not found');
                err.status = 404;
                return next(err);
            }
            res.render('modelkits_form', { title: 'Update Model kit', modelkit: results.model, grade: results.grade, series: results.series });
        });
};

// Handle model kits update on POST.
// Updated with image upload feature.
exports.modelKits_update_post = [

    // Middleware for handling the image uploading feature.
    upload.single('model_image'),

    // Validate and sanitise fields.
    body('name', 'Name must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('grade', 'Grade must not be empty.').trim().isLength({ min: 1 }).escape(), // to ref to Grade
    body('price', 'Price must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('description', 'Description must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('series', 'Series must not be empty.').trim().isLength({ min: 1 }).escape(), // to ref to Series
    body('numberInStock', 'Number in stock must not be empty.').trim().isLength({ min: 1 }).escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a ModelKits object with escaped/trimmed data and old id.
        var model = new ModelKits(
          { name: req.body.name,
            grade: req.body.grade,
            price: req.body.price,
            description: req.body.description,
            series: req.body.series,
            numberInStock: req.body.numberInStock,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.
            // Get all grades and series for form.
            async.parallel({
                grade: function(callback) {
                    Grade.find(callback);
                },
                series: function(callback) {
                    Series.find(callback);
                },
            }, function(err, results) {
                if (err) { return next(err); }
                res.render('modelkits_form', { title: 'Update Model kit', grade: results.grade, series: results.series, modelkit: model, errors: errors.array() });
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            if (!req.hasOwnProperty('file')) {
                // No new image has been uploaded during the updating process
                ModelKits.findByIdAndUpdate(req.params.id, model, {}, function (err,updatedmodel) {
                    if (err) {
                        return next(err);
                    }
                       // Successful - redirect to model kit detail page.
                       res.redirect(updatedmodel.url);
                });
            } else {
                // Users have added a new image during the updating process
                model.model_image = req.file.path;
                ModelKits.findByIdAndUpdate(req.params.id, model, {}, function (err,updatedmodel) {
                    if (err) {
                        return next(err);
                    }
                       // Successful - redirect to model kit detail page.
                       res.redirect(updatedmodel.url);
                });
            }
        }
    }
];