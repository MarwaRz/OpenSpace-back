const express = require('express');
const http = require('http');
const app = express();

const router = express.Router();
const Segment = require('../models/Segment');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const moment = require('moment-timezone');
const Reservation = require('../models/Reservation');
const Poste = require('../models/Poste');
const server = http.createServer(app);
const socketIo = require('socket.io');


const io = socketIo(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});
const broadcastUpdate = (message) => {
  io.emit('update', message);
};
const secretKey = process.env.JWT_SECRET; 
const decryptEmail = (encrypted) => {

  const [encryptedEmail, date] = encrypted.split('/'); 
  const dateConvert = new Date(Number(date));
  dateConvert.setMinutes(0, 0, 0);
 


  const [iv, encryptedText] = encryptedEmail.split(':');
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
  let decryptedEmail = decipher.update(encryptedText, 'hex', 'utf8');
  decryptedEmail += decipher.final('utf8');
  return decryptedEmail;
};




  /**
  * Cancel reservation for Meeting room 
  */
router.delete('/annuler_reservation/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Email non trouvé');
  }

  try {
    const decryptedEmail = decryptEmail(email);
    
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).send('Reservation non trouvé');
    }

    if (reservation.email !== decryptedEmail) {
      return res.status(403).send('Non autorisé');
    }

    await Reservation.findByIdAndDelete(id);

    const poste = await Poste.findById(reservation.poste);
    if (poste) {
      const reservations = await Reservation.find({ poste: reservation.poste });
      poste.availability = !reservations.some(res => {
        return moment(res.endTime, 'HH:mm').isAfter(moment(), 'minute');
      });
      await poste.save();
    }

    res.send('Reservation success');
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).send('Erreur');
  }
});


/**
 * Cancel a post reservation 
 */
router.delete('/cancel-other/:id', async (req, res) => {
  const encryptedEmail = req.query.email;
  const id = req.params.id;

  let decryptedEmail;

  try {
    decryptedEmail = decryptEmail(encryptedEmail).split(':')[0];
  } catch (error) {
    return res.status(400).send('Email invalide');
  }

  try {
    const poste = await Poste.findById(id);

    if (!poste) {
      return res.status(404).send('Poste non trouvé');
    }

    if (poste.guest === decryptedEmail) {
      await Poste.findByIdAndUpdate(id, {
        availability: true,
        guest: null
      }, { new: true });

      res.send('Réservation annulée avec succès');
    } else {
      return res.status(404).send('Réservation non trouvée');
    }
  } catch (error) {
    res.status(500).send('Erreur');
  }
});






/**
 * Reserve one post for each collaborator
 */
router.post('/reserve/:id', async (req, res) => {
  const id = req.params.id;
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Email obligatoire');
  }

  try {
    const decryptedEmail = decryptEmail(email);

    const existingPoste = await Poste.findOne({ guest: decryptedEmail });

    if (existingPoste) {
      return res.status(400).send('email a déja une reservation');
    }

    const poste = await Poste.findById(id);

    if (!poste) {
      return res.status(404).send('Poste not found');
    }

    if (poste.guest) {
      return res.status(400).send('Poste est déja resérver');
    }


    poste.guest = decryptedEmail;
    poste.availability = false;

    await poste.save();

    broadcastUpdate({
      action: 'update',
      id,
      status: 'reserved',
      email: decryptedEmail
    });

    res.send(`Reservation  ${decryptedEmail}`);
  } catch (error) {
    res.status(500).send('Erreur');
  }
});


/**
 * Reserve meeting room 
 */
router.post('/reserve_salle/:id', async (req, res) => {
  const id = req.params.id;
  const { email } = req.query;
  const { startTime, endTime } = req.body;

  if (!email) {
    return res.status(400).send('L\'email est requis');
  }

  if (!startTime || !endTime) {
    return res.status(400).send('Les heures de début et de fin sont requises');
  }

  try {
    const decryptedEmail = decryptEmail(email);

    const poste = await Poste.findById(id);
    if (!poste) {
      return res.status(404).send('Poste non trouvé');
    }

    const today = moment().tz('Africa/Tunis').startOf('day');
    const startMoment = today.clone().set({
      hour: parseInt(startTime.split(':')[0]),
      minute: parseInt(startTime.split(':')[1]),
    });

    const endMoment = today.clone().set({
      hour: parseInt(endTime.split(':')[0]),
      minute: parseInt(endTime.split(':')[1]),
    });

    const startOfDay = today.clone().set({ hour: 8, minute: 0 });
    const endOfDay = today.clone().set({ hour: 18, minute: 0 });

   

    if (startMoment.isAfter(endMoment)) {
      return res.status(400).send('L\'heure de début doit être avant l\'heure de fin');
    }

    

    

  if (endMoment.isAfter(endOfDay) || startMoment.isBefore(startOfDay)) {
     return res.status(400).send('La réservation est entre 08:00 et 18:00');
   }

    const existingReservation = await Reservation.find({
      poste: id,
      $or: [
        { startTime: { $lt: endMoment.format('HH:mm') }, endTime: { $gt: startMoment.format('HH:mm') } }
      ]
    });

    if (existingReservation.length > 0) {
      return res.status(400).send('La salle est déjà réservée pendant cette période');
    }

    const newReservation = new Reservation({
      poste: id,
      startTime: startMoment.format('HH:mm'),
      endTime: endMoment.format('HH:mm'),
      email: decryptedEmail
    });

    await newReservation.save();

    const reservations = await Reservation.find({ poste: id });
    poste.availability = !reservations.some(reservation => {
      const resEndMoment = moment(reservation.endTime, 'HH:mm');
      return resEndMoment.isAfter(moment(), 'minute');
    });

    await poste.save();

    broadcastUpdate({
      action: 'update',
      id,
      status: 'reserved',
      email: decryptedEmail
    });

    res.send(`Réservation ${decryptedEmail}`);
  } catch (error) {
    res.status(500).send('Erreur');
  }
});



/**
 * Get the reservations of a collaborator 
 */
router.get('/poste', async (req, res) => {
  const encryptedEmail = req.query.email;
  let decryptedEmail;

  try {
    decryptedEmail = decryptEmail(encryptedEmail).split(':')[0]; 
  } catch (error) {
    return res.status(400).send('email invalide');
  }

  try {
    
    const postes = await Poste.find({ guest: decryptedEmail });

    res.json(postes);
  } catch (error) {
    res.status(500).send('Erreur');
  }
});


/**
 * Get the reservations of a collaborator ( metting room)
 */
router.get('/salle', async (req, res) => {
  const encryptedEmail = req.query.email;
  let decryptedEmail;

  try {
    decryptedEmail = decryptEmail(encryptedEmail).split(':')[0]; 
  } catch (error) {
    return res.status(400).send('Email invalide');
  }

  try {
    
    const reservations = await Reservation.find({ email: decryptedEmail });

    res.json( reservations);
  } catch (error) {
    res.status(500).send('Erreur');
  }
});



/**
 * Get all posts
 */
router.get('/list', async (req, res) => {
  try {
    const postes = await Poste.find().populate('segment');
    res.json(postes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get the list reservations for a post by its ID
 */
router.get('/:id/reservations', async (req, res) => {
  const { id } = req.params;
  const now = moment().tz('Africa/Tunis').startOf('minute');

  try {
    const reservations = await Reservation.find({
      poste: id,
      endTime: { $gt: now.format('HH:mm') } 
    }).populate('poste');

    io.emit( reservations);

    res.json(reservations);

  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

/**
 * Get a post 
 */
router.get('/:id', async (req, res) => {
  try {
    const poste = await Poste.findById(req.params.id)
    if (!poste) {
      return res.status(404).json({ message: 'Poste non trouvé' });
    }
    res.json(poste);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/**
 * Update post attribues
 */
router.put('/:id', async (req, res) => {
  try {
    const { code, type, availability } = req.body;
    const posteId = req.params.id;

    if (code && code.trim() !== '') {
      const existingPoste = await Poste.findOne({ code });
      if (existingPoste && existingPoste._id.toString() !== posteId) {
        return res.status(400).json({ message: ' Ce code existe déjà' });
      }
    }

    const poste = await Poste.findByIdAndUpdate(posteId, { code, type, availability }, { new: true });
    if (!poste) {
      return res.status(404).json({ message: 'Poste non trouvé' });
    }

    res.json(poste);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


/**
 * Delete a post 
 */
router.delete('/:id', async (req, res) => {
  try {
    const poste = await Poste.findByIdAndDelete(req.params.id);
    if (!poste) {
      return res.status(404).json({ message: 'Poste non trouvé' });
    }

    const segment = await Segment.findById(poste.segment);
    segment.postes.pull(poste.id);
    await segment.save();

    res.json({ message: 'Poste supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


 

module.exports = router;
