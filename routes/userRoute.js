const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logoutMiddleware = require('../midleware/logoutMiddlleware');
const router = express.Router();
const crypto = require('crypto');
const moment = require('moment-timezone');
const secretKey = process.env.JWT_SECRET; 
const decryptEmail = (encrypted) => {
 const curentDate = moment.tz('Africa/Tunis');
  console.log('curentDate', curentDate);

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
 * Testing email= encryptedEmail
 */
 router.post('/tester', (req, res) => {
    const { email } = req.body;
    const encryptedEmail = req.query.email;
  
    try {
      const decryptedEmail = decryptEmail(encryptedEmail);
      const isValid = decryptedEmail === email;
  
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error during email validation:', error);
      res.status(500).json({ valid: false });
    }

  });
  

  /**
   * Authenticate
   */
  router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) throw new Error('User not found');

        const isMatch = await bcrypt.compare(password, user.password); 
        if (!isMatch) throw new Error('Invalid credentials');

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token); 
        res.status(200).json({ token }); 
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
});

  
 
  router.post('/logout', logoutMiddleware);
  
  module.exports = router;