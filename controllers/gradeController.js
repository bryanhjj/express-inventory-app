var Grade = require('../models/grade');
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

// Display list of all Grades.
exports.grade_list = function(req, res, next) {
    Grade.find()
      .sort([['grade_name', 'ascending']])
      .exec(function (err, list_grade) {
        if (err) { return next(err); }
        //Successful, so render
        res.render('grade_list', { title: 'Grade List', grade_list: list_grade });
      });
};

// Display detail page for a specific Grade.
exports.grade_detail = function(req, res, next) {
    async.parallel({
        grade: function(callback) {
            Grade.findById(req.params.id).exec(callback);
        },
        grade_modelkits: function(callback) {
            ModelKits.find({ 'grade': req.params.id }).populate('series', 'series_name').exec(callback);
        },
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.grade == null) {
            var err = new Error('Grade not found');
            err.status = 404;
            return next(err);
        }
        console.log(results.grade);
        res.render('grade_detail', {title: 'Grade Details', grade: results.grade, grade_modelkits: results.grade_modelkits});
    }
    );
};

// Display Grade create form on GET.
exports.grade_create_get = function(req, res) {
    res.render('grade_form', { title: 'Create Grade' });
};

// Handle Genre create on POST.
// Updated with the feature to upload images
exports.grade_create_post =  [

    // Middleware for handling images
    upload.single('icon_image'),

    // Validate and santize the name field.
    body('grade_name', 'Grade name required').trim().isLength({ min: 1 }).escape(),
    body('grade_description', 'Description required').trim().isLength({ min: 1 }).escape(),
  
    // Process request after validation and sanitization.
    (req, res, next) => {
  
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a genre object with escaped and trimmed data.
      var grade = new Grade(
        {   grade_name: req.body.grade_name,
            grade_description: req.body.grade_description
        }
      );
  
      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render('grade_form', { title: 'Create Grade', grade: grade, errors: errors.array()});
        return;
      }
      else {
        // Data from form is valid.
        // Check if Grade with same name already exists.
        Grade.findOne({ 'grade_name': req.body.grade_name })
          .exec(function(err, found_grade) 
            {
             if (err) { return next(err); 
            }
  
             if (found_grade) {
               // Grade exists, redirect to its detail page.
               res.redirect(found_grade.url);
             }
              if (!req.hasOwnProperty('file')) {
                grade.save(function (err) {
                 if (err) { return next(err); }
                 // Grade saved. Redirect to grade detail page.
                 res.redirect(grade.url);
               });
              } else {
                // if users have uploaded and image, append the image to the grade object
                grade.icon_image= req.file.path;
                grade.save(function (err) {
                  if (err) { return next(err); }
                  // Genre saved. Redirect to grade detail page.
                  res.redirect(grade.url);
                });
              }
           });
      }
    }
];


// Display Grade delete form on GET.
exports.grade_delete_get = function(req, res, next) {
  async.parallel({
    grade: function(callback) {
      Grade.findById(req.params.id).exec(callback);
    },
    grade_modelkits: function(callback) {
      ModelKits.find({ 'grade': req.params.id }).exec(callback)
    },
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    if (results.grade==null) { // No results.
        res.redirect('/catalog/grades');
    }
    // Successful, so render.
    res.render('grade_delete', { title: 'Delete Grade', grade: results.grade, grade_modelkits: results.grade_modelkits } );
  });
};

// Handle Grade delete on POST.
exports.grade_delete_post = function(req, res, next) {
  async.parallel({
    grade: function(callback) {
      Grade.findById(req.body.gradeid).exec(callback)
    },
    grade_modelkits: function(callback) {
      ModelKits.find({ 'grade': req.body.gradeid }).exec(callback)
    },
  }, function(err, results) {
    if (err) { return next(err); }
    // Success
    if (results.grade_modelkits.length > 0) {
        // Grade has associated model kits, inform the users that said model kits should be deleted first before deleting the grade.
        res.render('grade_delete', { title: 'Delete Grade', grade: results.grade, grade_modelkits: results.grade_modelkits } );
        return;
    }
    else {
        // Grade has no associated model kits, clear to be deleted
        Grade.findByIdAndRemove(req.body.gradeid, function deleteGrade(err) {
            if (err) {
              return next(err);
            }
            // Success - go to author list
            res.redirect('/catalog/grades')
        });
    }
  });
};

// Display Grade update form on GET.
exports.grade_update_get = function(req, res, next) {

    // Get grade details for the update form
    async.parallel({
      grade: function(callback) {
        Grade.findById(req.params.id).exec(callback);
      },
    }, function(err, results) {
          if (err) {
            return next(err);
          }
          if (results.grade==null) { // No results.
              var err = new Error('Grade not found');
              err.status = 404;
              return next(err);
          }
          // Success. Render the update form
          res.render('grade_form', { title: 'Update Grade', grade: results.grade });
    });
};

// Handle Grade update on POST.
// Updated with image upload feature.
exports.grade_update_post = [

  // middleware for the image uploading feature.
  upload.single('icon_image'),

  // Validate and sanitise fields.
  body('grade_name', 'Grade name required').trim().isLength({ min: 1 }).escape(),
  body('grade_description', 'Description required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

      // Extract the validation errors from a request.
      const errors = validationResult(req);
      console.log(req.file);

      // Create a Book object with escaped/trimmed data and old id.
      var grade = new Grade(
        { 
          grade_name: req.body.grade_name,
          grade_description: req.body.grade_description,
          _id:req.params.id // This is required, or a new ID will be assigned!
        });

      if (!errors.isEmpty()) {
        return next(errors);
      } else {
        // When users did not upload an image while updating Grade
        if (!req.hasOwnProperty('file')) {
          // Data from form is valid. Update the record.
          Grade.findByIdAndUpdate(req.params.id, grade, {}, function (err,updatedgrade) {
            if (err) {
              return next(err);
            }
            // Successful - redirect to updated grade detail page.
            res.redirect(updatedgrade.url);
          });
        } else {
          // When users upload an image while updating Grade
          grade.icon_image = req.file.path;
          Grade.findByIdAndUpdate(req.params.id, grade, {}, function(err,updatedgrade) {
            if (err) {
              return next(err);
            }
            res.redirect(updatedgrade.url);
          });
        }
      }
  }
];