const express = require('express');
const router = express.Router();
const http = require('http');
const app = express();
const Reservation = require('../models/Reservation');
const Plateau = require('../models/Plateau');
const Segment = require('../models/Segment');
const Poste = require('../models/Poste');
const server = http.createServer(app);
const socketIo = require('socket.io');
const DailyReservation = require('./DailyReservation');
const Emails = require('./Emails')

const moment = require('moment-timezone');
const io = socketIo(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});




/**
 *  Clear the reservation data
 */
router.post('/daily-clear', async (req, res) => {
  try {
    await DailyReservation();
    res.status(200).json({ message: 'les données de la réservation ont été réinitialisées avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des réservations.' });
  }
});

/**
 * Send emails to all the collaborations
 */
router.post('/emails', async (req, res) => {
  try {
    await Emails();
    res.status(200).json({ message: 'Les emails ont été envoyés avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l envoi des emails.' });
  }
});

/**
 * Get a plateau'reservation by its ID
 */
router.get('/:id/reservations', async (req, res) => {
  const { id } = req.params;
  const now = moment().tz('Africa/Tunis').startOf('minute');

  try {
    const plateau = await Plateau.findById(id).populate({
      path: 'segments',
      populate: {
        path: 'postes'
      }
    });


    if (!plateau) {
      return res.status(404).json({ message: 'Plateau non trouvé.' });
    }

    const postes = plateau.segments.flatMap(segment => segment.postes);

    const reservations = await Reservation.find({
      poste: { $in: postes.map(poste => poste._id) },
      endTime: { $gt: now.format('HH:mm') } 
    }).populate('poste');
    io.emit( reservations);

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réécupération des reservation.' });
  }
});



/**
 * Delete an email from a plateau
 */
router.delete('/:id/:email', async (req, res) => {
  const id = req.params.id;
  const emailToDelete = req.params.email;

  try {
    const plateau = await Plateau.findById(id);

    if (!plateau) {
      return res.status(404).json({ message: 'Plateau non trouvé' });
    }

    const existingEmail = plateau.emails.findIndex(email => email === emailToDelete);
    if (existingEmail === -1) {
      return res.status(404).json({ message: 'Email non trouvé dans le plateau' });
    }

    plateau.emails.splice(existingEmail, 1);

    await plateau.save();

    res.json({ message: 'Email supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'email' });
  }
});

/** 
 * Add one or many emails to a plateau
 */
router.post('/:id/emails', async (req, res) => {
  const { id } = req.params;
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Email vide ou invalide' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const invalidEmails = emails.filter(email => !emailRegex.test(email));
  if (invalidEmails.length > 0 ) {
    return res.status(400).json({ error: `Format d'email invalide : ${invalidEmails.join(', ')}` });
  }

  try {
    const plateau = await Plateau.findById(id);
    if (!plateau) {
      return res.status(404).json({ error: 'Plateau non trouvé' });
    }

    const duplicateEmails = emails.filter(email => plateau.emails.includes(email));
    if (duplicateEmails.length > 0) {
      return res.status(400).json({ error: `Emails  existent déjà ' ${duplicateEmails.join(', ')}'` });
    }

    plateau.emails = [...plateau.emails, ...emails];
    await plateau.save();

    res.status(200).json({ message: 'Emails ajouté avec succés', plateau });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





/**
 * Update plateau name
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const existingPlateau = await Plateau.findOne({ name: name, _id: { $ne: id } });
    if (existingPlateau) {
      return res.status(400).json({ message: 'Le nom de ce plateau existe déjà' });
    }

    const plateau = await Plateau.findByIdAndUpdate(id, { name }, { new: true });
    if (!plateau) {
      return res.status(404).json({ message: 'Plateau non trouvé' });
    }

    res.json(plateau);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});






/**
 * Get a plateau with its segments and post
 */
router.get('/:id/segments', async (req, res) => {
  const { id } = req.params;

  try {
    const plateau = await Plateau.findById(id).populate({
      path: 'segments',
      populate: {
        path: 'postes',
        model: 'Poste'
      }
    });

    if (!plateau) {
      return res.status(404).json({ error: 'Plateau non trouvé' });
    }


    const plateauData = {
      name: plateau.name,
      emails:plateau.emails,
      segments: plateau.segments.map(segment => {
        return {
          id: segment.id, 
          code: segment.code,
          capacité: segment.capacité,
          numberOfPostes: segment.numberOfPostes,
          postes: segment.postes.map(poste => {
            return {
              id: poste.id, 
              code: poste.code,
              type: poste.type,
              guest: poste.guest,
              availability: poste.availability
            };
          })
        };
      })
    };

    res.json(plateauData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




/**
 * Get list plateau
 */
router.get('/', async (req, res) => {
  try {
    const plateaux = await Plateau.find();
    res.json(plateaux);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



 
/**
 * Add new plateau
 */

router.post('/', async (req, res) => {
  const { name } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: 'Le nom du plateau est requis' });
    }

    const existingPlateau = await Plateau.findOne({ name });
    if (existingPlateau) {
      return res.status(400).json({ error: 'Le nom de ce plateau existe déjà' });
    }

    const plateau = new Plateau({ name });
    await plateau.save();
    res.status(201).json({ message: 'Plateau ajouté avec succès', plateau });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * Create segments and its posts
 */

router.post('/:plateauId/segments', async (req, res) => {
  const { plateauId } = req.params;
  const segmentsData = req.body; 

  try {
    if (!Array.isArray(segmentsData) || segmentsData.length === 0) {
      return res.status(400).json({ error: 'Veuillez ajouter au moins un segment' });
    }
    const plateau = await Plateau.findById(plateauId);
    if (!plateau) {
      return res.status(404).json({ error: 'Plateau non trouvé' });
    }

    const createdSegments = [];

    for (let segmentData of segmentsData) {
      const { code, capacité, numberOfPostes } = segmentData;

     
      const existingSegment = await Segment.findOne({ 
        code : code,
        plateau: plateauId 
      });


      if (existingSegment) {
        return res.status(400).json({ error: `Le code ' ${code} ' existe déjà dans ce plateau.` });
      }

/**
 * Create a segment
 */
      const segment = new Segment({ code, capacité, numberOfPostes, plateau: plateau.id });
      await segment.save();


      for (let i = 0; i < numberOfPostes; i++) {
        const poste = new Poste({ code: "", type: "Poste DEV", availability: true, segment: segment.id });
        await poste.save();
        segment.postes.push(poste.id);
      }

      await segment.save();
      plateau.segments.push(segment.id);
      createdSegments.push(segment); 
    }

    await plateau.save();

    res.status(201).json({ message: 'Segments ajoutés avec succès', segments: createdSegments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



/**
 * Delete a plateau with its segments and posts
 */

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const plateau = await Plateau.findById(id);
    if (!plateau) {
      return res.status(404).json({ error: 'Plateau non trouvé' });
    }

    const segments = await Segment.find({ plateau: id });
    for (let segment of segments) {
      await Poste.deleteMany({ segment: segment.id });
    }

    await Segment.deleteMany({ plateau: id });

    await Plateau.findByIdAndDelete(id);

    res.status(200).json({ message: 'Plateau supprimé avec succés' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a plateau with its ID
 */
router.get('/:id', async (req, res) => {
  try {
    const plateau = await Plateau.findById(req.params.id)
    if (!plateau) {
      return res.status(404).json({ message: 'plateau non trouvé' });
    }  
    res.json(plateau);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






module.exports = router;
