const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlateauSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  segments: [{
    type: Schema.Types.ObjectId,
    ref: 'Segment'
  }],
  emails: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} invalide`
    }
  }]
});

module.exports = mongoose.model('Plateau', PlateauSchema);
