const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PosteSchema = new Schema({
 code: { type: String, required: false},
 type: { type: String, required: false },

  availability: { type: Boolean, required: false },
  segment: { type: Schema.Types.ObjectId, ref: 'Segment', required: true },
  guest: { type: String, require:false }, 
 
});

module.exports = mongoose.model('Poste', PosteSchema);
