const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReservationSchema = new Schema({
  poste: { type: Schema.Types.ObjectId, ref: 'Poste', required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  email: { type: String, required: true },

});

module.exports = mongoose.model('Reservation', ReservationSchema);
