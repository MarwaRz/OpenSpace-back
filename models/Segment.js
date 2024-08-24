const mongoose = require('mongoose');

const SegmentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
 
  numberOfPostes: {
    type: Number,
    required: true
  },
  plateau: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plateau'
  },
  postes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poste'
    }
  ]
});

const Segment = mongoose.model('Segment', SegmentSchema);
module.exports = Segment;
