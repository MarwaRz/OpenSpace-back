const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
require('dotenv').config();
const moment = require('moment-timezone');
const Reservation = require('./models/Reservation');
const Poste = require('./models/Poste');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const socketIo = require('socket.io');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const server = http.createServer(app);


const io = socketIo(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: process.env.REACT_URL, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
/**
 * Creat an admin accout 
 */
const createDefaultUser = async () => {
  try {
    const email = 'exemple@gmail.com'; 
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      const newUser = new User({ 
        firstname: 'exemplefirstname',
        lastname: 'exemplelastname',
        email: email,
        password:'exemplepassword',
        role: 'admin'
      });

      await newUser.save();
      console.log('Compte admin créer avec succes!');
    } else {
      console.log('Compte admin déja créé !');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  }
};


mongoose.connect(process.env.CONNECTION)
  .then(async () => {

    await createDefaultUser();

  
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });




const segmentRoute = require('./routes/segmentRoute');
const postRoute = require('./routes/postRoute');
const plateauRoute = require('./routes/plateauRoute');
const userRoute = require('./routes/userRoute');

app.use('/api/segments', segmentRoute);
app.use('/api/postes', postRoute);
app.use('/api/plateaux', plateauRoute);
app.use('/api/users', userRoute);


const updatePostStatuses = async () => {
  const now = moment().tz('Africa/Tunis');

  try {
    const posts = await Poste.find();
    if (posts.length === 0) {
      return;
    }

    const reservations = await Reservation.find().populate('poste');

    const postUpdates = [];

    reservations.forEach(reservation => {
      const startTime = moment(reservation.startTime, 'YYYY-MM-DDTHH:mm:ssZ').tz('Africa/Tunis');
      const endTime = moment(reservation.endTime, 'YYYY-MM-DDTHH:mm:ssZ').tz('Africa/Tunis');
      const post = reservation.poste;

      if (post) {
        const lastAvailability = post.availability;
        post.availability = now.isBetween(startTime, endTime) ? false : true;
        
        if (lastAvailability !== post.availability) {
          postUpdates.push(post);
        }
      }
    });

    if (postUpdates.length === 0) {
      io.emit('update');
    }

    for (const post of postUpdates) {
      await post.save();
      io.emit('update', { postId: post.id, status: post.availability ? 'available' : 'reserved' });
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
};

setInterval(updatePostStatuses, 100);

server.listen(process.env.PORT, () => {
});


