var Series = require('../models/series');
var ModelKits = require('../models/modelkits');
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

// Display list of all Series.
exports.series_list = function(req, res, next) {
    Series.find()
      .sort([['series_name', 'ascending']])
      .exec(function (err, list_series) {
        if (err) { return next(err); }
        //Successful, so render
        res.render('series_list', { title: 'Series List', series_list: list_series });
      });
};
// Display detail page for a specific Series.
exports.series_detail = function(req, res, next) {
    async.parallel({
        series_info: function(callback) {
            Series.findById(req.params.id).exec(callback);
        },
        series_modelkits: function(callback) {
            ModelKits.find({ 'series': req.params.id}).populate('grade', 'grade_name').exec(callback);
        },
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.series_info == null) {
            var err = new Error('Series not found');
            err.status = 404;
            return next(err);
        }
        res.render('series_detail', {series: results, series_modelkits: results.series_modelkits});
    });
};

// Display Series create form on GET.
exports.series_create_get = function(req, res) {
    res.render('series_form', { title: 'Create Series' });
};

// Handle Series create on POST.
// Updated with image uploading feature
exports.series_create_post = [

    // Middleware for handling the image uploading feature.
    upload.single('series_image'),
    
    // Validate user input
    body('series_name', 'Name required').trim().isLength({ min: 1 }).escape(),
    body('series_description', 'Description required').trim().isLength({ min: 1 }).escape(),

    // Proceed with the create request after validation has been completed
    (req, res, next) => {

        // Extract errors, if any
        const errors = validationResult(req);

        // Create new Series object with the validated input
        var series = new Series(
            {
            series_name: req.body.series_name,
            series_description: req.body.series_description,
        }
        );
        if (!errors.isEmpty()) {
            // There are errors. Render the form again with sanitized values/error messages.
            res.render('series_form', { title: 'Create Series', series: series, errors: errors.array()});
            return;
        } else {
            // No error and data is valid
            // Check if the Series the user is trying to create already exists
            Series.findOne({'series_name': req.body.series_name})
            .exec(function(err, foundSeries){
                if (err) {
                    next(err);
                }
                if (foundSeries) {
                    res.redirect(foundSeries.url);
                } else {
                    if(!req.hasOwnProperty('file')){
                        // if users did not add/upload a file for the series creation
                        series.save(function(err) {
                            if (err) {
                                next(err);
                            }
                            res.redirect(series.url);
                        })
                    } else {
                        // when an image is uploaded upon series creation
                        series.series_image = req.file.path;
                        series.save(function(err) {
                            if (err) {
                                next(err);
                            }
                            res.redirect(series.url);
                        });
                    }
                }
            });
        }
    }
];

// Display Series delete form on GET.
exports.series_delete_get = function(req, res) {
    async.parallel({
        series: function(callback) {
            Series.findById(req.params.id).exec(callback);
        },
        series_modelkits: function(callback) {
          ModelKits.find({ 'series': req.params.id }).exec(callback)
        },
      }, function(err, results) {
        if (err) {
          return next(err);
        }
        if (results.series==null) { // No results.
            res.redirect('/catalog/series');
        }
        // Successful, so render.
        res.render('series_delete', { title: 'Delete Series', series: results.series, series_modelkits: results.series_modelkits } );
      });
};

// Handle Series delete on POST.
exports.series_delete_post = function(req, res) {
    async.parallel({
        series: function(callback) {
            Series.findById(req.body.seriesid).exec(callback)
        },
        series_modelkits: function(callback) {
          ModelKits.find({ 'series': req.body.seriesid }).exec(callback)
        },
      }, function(err, results) {
        if (err) { return next(err); }
        // Success
        if (results.series_modelkits.length > 0) {
            // Series has associated model kits, inform the users that said model kits should be deleted first before deleting the series.
            res.render('series_delete', { title: 'Delete Series', series: results.series, series_modelkits: results.series_modelkits } );
            return;
        }
        else {
            // Series has no associated model kits, clear to be deleted
            Series.findByIdAndRemove(req.body.seriesid, function deleteSeries(err) {
                if (err) {
                  return next(err);
                }
                // Success - redirect to series list
                res.redirect('/catalog/series')
            });
        }
    });
};

// Display Series update form on GET.
exports.series_update_get = function(req, res, next) {
    
    // Get grade details for the update form
    async.parallel({
        series: function(callback) {
            Series.findById(req.params.id).exec(callback);
        },
      }, function(err, results) {
            if (err) {
              return next(err);
            }
            if (results.series==null) { // No results.
                var err = new Error('Series not found');
                err.status = 404;
                return next(err);
            }
            // Success. Render the update form
            res.render('series_form', { title: 'Update Series', series: results.series });
      });
};

// Handle Series update on POST
// Updated with image upload feature
exports.series_update_post = [

    // Middleware for handling image uploads.
    upload.single('series_image'),

    // Validate and sanitise fields.
    body('series_name', 'Series name required').trim().isLength({ min: 1 }).escape(),
    body('series_description', 'Description required').trim().isLength({ min: 1 }).escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Series object with escaped/trimmed data and old id.
        var series = new Series(
        { 
            series_name: req.body.series_name,
            series_description: req.body.series_description,
            _id:req.params.id // This is required, or a new ID will be assigned!
        });

        if (!errors.isEmpty()) {
            return next(errors);
        } else {
            if (!req.hasOwnProperty('file')) {
                // When users did not upload an image while updating
                Series.findByIdAndUpdate(req.params.id, series, {}, function(err, updatedseries) {
                    if (err) {
                        return next(err);
                    }
                    // Update success - redirect users to the updated detail page.
                    res.redirect(updatedseries.url);
                })
            } else {
                // When users upload a new image while updating
                series.series_image = req.file.path;
                Series.findByIdAndUpdate(req.params.id, series, {}, function(err, updatedseries) {
                    if (err) {
                        return next(err);
                    }
                    // Update success - redirect users to the updated detail page.
                    res.redirect(updatedseries.url);
                });
            }
        }
    }     
];