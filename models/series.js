var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SeriesSchema = new Schema(
  {
    series_name: {type: String, required: true},
    series_description: {type: String, required: true},
    // Updated with the feature to upload images, optional
    series_image: {type: String},
  }
);

// Virtual for series's name
SeriesSchema
.virtual('name')
.get(function () {
  return this.name;
});

// Virtual for series's description
SeriesSchema
.virtual('description')
.get(function() {
  return this.description;
});

// Virtual for series's URL
SeriesSchema
.virtual('url')
.get(function () {
  return '/catalog/series/' + this._id;
});

//Export model
module.exports = mongoose.model('Series', SeriesSchema);