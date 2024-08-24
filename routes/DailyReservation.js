const cron = require('node-cron');
const Poste = require('../models/Poste');
const Reservation = require('../models/Reservation');


/**
 * Clear list reservation at 18:00  every day
 */
const cronClear = process.env.CRON_CLEAR_RESERVATION; 
const DailyReservation = async () => {
  try {
    const result = await Poste.updateMany({}, { 
      $set: { availability: true, guest: null }
    });
    const results = await Reservation.updateMany({}, { 
      $set: { email: null, startTime: null , endTime:null }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des postes:', error);
  }
};

cron.schedule(cronClear, () => {
  console.log('les données de la réservation ont été réinitialisées avec succès');
  DailyReservation();
});

module.exports = DailyReservation;
