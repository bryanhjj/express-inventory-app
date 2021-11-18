var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GradeSchema = new Schema(
  {
    grade_name: {type: String, required: true},
    grade_description: {type: String, required: true},
    // Updated with the feature to upload images, optional
    icon_image: {type: String},
  }
);

// Virtual for grade's name
GradeSchema
.virtual('name')
.get(function () {
  return this.name;
});

// Virtual for author's description
GradeSchema
.virtual('description')
.get(function() {
  return this.description;
});

// Virtual for Grade's URL
GradeSchema
.virtual('url')
.get(function () {
  return '/catalog/grade/' + this._id;
});

//Export model
module.exports = mongoose.model('Grade', GradeSchema);