var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ModelKitsSchema = new Schema(
  {
    name: {type: String, required: true},
    grade: {type: Schema.Types.ObjectId, ref: 'Grade', required: true},
    price: {type: Number, required: true},
    description: {type: String, required: true},
    series: {type: Schema.Types.ObjectId, ref: 'Series', required: true},
    numberInStock: {type: Number, required: true},
    // Updated with the feature to upload images, optional
    model_image: {type: String},
  }
);

// Virtual for model kits's URL
ModelKitsSchema
.virtual('url')
.get(function () {
  return '/catalog/ModelKits/' + this._id;
});

//Export model
module.exports = mongoose.model('ModelKit', ModelKitsSchema);