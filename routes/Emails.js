const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Plateau = require('../models/Plateau');
const moment = require('moment-timezone');
const crypto = require('crypto');

const cronTime = process.env.CRON_SEND_EMAILS;
const secretKey = process.env.JWT_SECRET;
const url = process.env.REACT_URL;
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.USER_EMAIL, 
    pass: process.env.PASS_EMAIL
  }
});

const encryptEmail = (email) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(secretKey).digest(); 
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encryptedEmail = cipher.update(email, 'utf8', 'hex');
  encryptedEmail += cipher.final('hex');
  return iv.toString('hex') + ':' + encryptedEmail; 
};

/**
 * Send email Sunday to Thursday 18:30
 */

const Emails = async () => {
  try {
    const currentDateTime = moment.tz('Africa/Tunis');
    const currentDay = currentDateTime.day();

    const plateaux = await Plateau.find();

    const cuurentDate = Date.now('Africa/Tunis');
    for (const plateau of plateaux) {
      for (const email of plateau.emails) {
        const detailLink = `${url}/plateau/${plateau._id}?email=${encryptEmail(email)}/${cuurentDate}`;

        const mailOptions = {
          from: process.env.USER_EMAIL,
          to: email,
          subject: `Reservation OpenSpace`,
          text: `Bonjour,\n\nCeci est un rappel pour vous informer que vous pouvez réserver votre place,\n\n`+
          `Veuillez cliquer sur le lien ci-dessous pour effectuer votre réservation\n${detailLink}\n\nBonne réception,\n\n`+
          `Ceci est un mail automatique, merci de ne pas y répondre.`
        };

        await transporter.sendMail(mailOptions);
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
};

cron.schedule(cronTime, () => {
  console.log('Les emails sont en cours de transmission');
  Emails();
});

module.exports = Emails;
