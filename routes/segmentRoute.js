const express = require('express');
const router = express.Router();
const Segment = require('../models/Segment')
const Poste = require('../models/Poste');
const Plateau = require('../models/Plateau');


/**
 * Get all segment
 */
router.get('/listseg', async (req, res) => {
  try {
    const segments = await Segment.find().populate('postes');
    res.json(segments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/**
 * Get a segment
 */
router.get('/:id', async (req, res) => {
  try {
    const segment = await Segment.findById(req.params.id) 
    if (!segment) {
      return res.status(404).json({ message: 'Segment non trouvé' });
    }
    res.json(segment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




/**
 * Update segment 
 */
router.put('/:id', async (req, res) => {
  try {
    const { code } = req.body;

    const existingSegment = await Segment.findOne({ code });
    if (existingSegment && existingSegment._id.toString() !== req.params.id) {
      return res.status(400).json({ error: 'Le code existe déjà pour un autre segment' });
    }

    const segment = await Segment.findByIdAndUpdate(req.params.id, { code }, { new: true });
    if (!segment) {
      return res.status(404).json({ error: 'Segment non trouvé' });
    }

    res.json(segment);
  } catch (error) {
    console.error('Backend error:', error.message);
    res.status(400).json({ error: error.message });
  }
});


/**
 * Delete a segment with its posts 
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const segment = await Segment.findById(id);
    if (!segment) {
      return res.status(404).json({ message: 'Segment non trouvé' });
    }

    const plateau = await Plateau.findOne({ segments: id });
    if (!plateau) {
      return res.status(404).json({ message: 'Plateau contenant ce segment non trouvé' });
    }
    const existingSegment = plateau.segments.includes(id);
    if (!existingSegment) {
      return res.status(400).json({ message: 'Segment non trouvé dans le plateau' });
    }

    plateau.segments.pull(id);
    await plateau.save();
    await Poste.deleteMany({ segment: id});

    await Segment.findByIdAndDelete(id);
    res.json({
      message: 'Segment supprimé avec succes et retiré du plateau',plateauId: plateau._id,  existingSegment: existingSegment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/**
 * Add a post for a segment
 */
router.post('/add/:id', async (req, res) => {
  const { code, type, availability } = req.body; 
  const { id } = req.params;
  if (!type) {
    return res.status(400).json({ message: 'Le champ "type" est obligatoire.' });
  }
  try {
    const segment = await Segment.findById(id); 
    if (!segment) {
      return res.status(404).json({ message: 'Segment non trouvé' });
    }

    

    const newPoste = new Poste({ code, type, availability, segment: id});
    await newPoste.save(); 
    
    segment.postes.push(newPoste._id);
    await segment.save(); 
    
    res.status(201).json(newPoste); 
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});




module.exports = router;
