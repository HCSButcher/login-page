const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const async = require('async');
const dotenv = require('dotenv');
const User = require('../model/User.js');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
 
//load environment variables from .env file
dotenv.config();

// Route login
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('login', { title: 'login' });
});

// Redirect to login
router.get('/', (req, res) => {
  res.redirect('/login');
});

// Post for login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true 
  })(req, res, next);
});

// Route signup
router.get('/signup', forwardAuthenticated, (req, res) => {
  res.render('signup', { title: 'signUp' });
});

// Post request for signup
router.post('/signup', async (req, res, next) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  // Field validation
  if (!name || !email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }
  if (password !== password2) {
    errors.push({ msg: 'Passwords do not match' });
  }
  if (password && password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }
  if (errors.length > 0) {
    return res.render('signup', {
      title: 'signup',
      errors,
      name,
      email,
      password,
      password2
    });
  }

  // User creation logic
  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      errors.push({ msg: 'Email already exists' });
      return res.render('signup', {
        title: 'signup',
        errors,
        name,
        email,
        password,
        password2
      });
    }

    const newUser = new User({
      name,
      email,
      password
    });

    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);
    await newUser.save();

    // Authenticate and log in the new user
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.log(err);
        errors.push({ msg: 'Something went wrong. Please try again.' });
        return res.render('signup', {
          title: 'signup',
          errors,
          name,
          email,
          password,
          password2
        });
      }
      if (!user) {
        errors.push({ msg: info.message });
        return res.render('signup', {
          title: 'signup',
          errors,
          name,
          email,
          password,
          password2
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          console.log(err);
          errors.push({ msg: 'Something went wrong. Please try again.' });
          return res.render('signup', {
            title: 'signup',
            errors,
            name,
            email,
            password,
            password2
          });
        }
        req.flash('success_msg', 'You are now registered and logged in');
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  } catch (err) {
    console.log(err);
    errors.push({ msg: 'User validation failed. Please check that all fields are filled' });
    return res.render('signup', {
      title: 'signup',
      errors,
      name,
      email,
      password,
      password2
    });
  }
})
// Route home
router.get('/details', (req, res) => {
  res.render('details', { title: 'details' });
});

// Post request for home
router.post('/details', async (req, res) => {
  const { name, email, registration_number, address, phone_number } = req.body;
  let errors = [];

  if (!name || !email || !registration_number || !address || !phone_number) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (errors.length > 0) {
    return res.render('details', {
      title: 'details',
      errors,
      name,
      email,
      registration_number,
      address,
      phone_number
    });
  }

  try {
    const user = await User.findOne({ email: email });
    if (user) {
      errors.push({ msg: 'Email already exists' });
      return res.render('details', {
        title: 'details',
        errors,
        name,
        email,
        registration_number,
        address,
        phone_number
      });
    }

    const newUser = new User({
      name,
      email,
      registration_number,
      address,
      phone_number
    });

    await newUser.save();
    req.flash('success_msg', 'Thank you for adding your details');
    return res.redirect('/dashboard');
  } catch (err) {
    console.log(err);
    errors.push({ msg: 'User validation failed. Please check that all fields are filled' });
    return res.render('details', {
      title: 'details',
      errors,
      name,
      email,
      registration_number,
      address,
      phone_number
    });
  }
});


// Setup Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route for displaying reset password form
router.get('/reset', (req, res) => {
  res.render('reset', { title: 'Reset Password' });
});

// Route for handling reset password form submission
router.post('/reset', async (req, res, next) => {
  try {
    const { email } = req.body;
    const token = crypto.randomBytes(20).toString('hex');

    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'No account with that email address exists.');
      return res.redirect('/reset');
    }

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `http://${req.headers.host}/reset/${token}`;
    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,  // Replace with your actual email
      subject: 'Password Reset',
      html: `You are receiving this because you (or someone else) have requested the reset of the password for your account.<br><br>
      Please click on the following link, or paste this into your browser to complete the process:<br><br>
      <a href="${resetUrl}">Reset Your Password</a><br><br>
      If you did not request this, please ignore this email and your password will remain unchanged.<br>`,
    };

    await transporter.sendMail(mailOptions);
    req.flash('info', `An e-mail has been sent to ${user.email} with further instructions.`);
    res.redirect('/reset');
  } catch (err) {
    next(err);
  }
});

// Route for displaying the new password form
router.get('/reset/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/reset');
    }

    res.render('reset-password', { token: req.params.token, title: 'Reset Password' });
  } catch (err) {
    req.flash('error', 'An error occurred.');
    res.redirect('/reset');
  }
});

// Route for handling the new password submission
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password, password2 } = req.body;

    if (password !== password2) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('back');
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/reset');
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,  // Replace with your actual email
      subject: 'Your password has been changed',
      text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
    };

    await transporter.sendMail(mailOptions);
    req.flash('success', 'Success! Your password has been changed.');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'An error occurred.');
    res.redirect('/reset');
  }
});



//search route
router.get('/search',async (req, res)=>{
  try{
    const registration_number= req.query.registration_number;
    const searchResults = await User.find({registration_number: registration_number});
    res.render('dashboard', {
      user: req.user,
      searchResults,
      error_msg: null,
      title: 'Search Results'
     });
  } catch (err) {
    console.error(err);
    res.render('dashboard', {
      user:req.user,
      searchResults: null,
       error_msg: 'An error occurred while searching for contacts.',
       title: 'Error'
      });
  }
});


// Route dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { 
    title: 'dashboard',
     user: req.user,
     searchResults: null , 
     error_msg: null,    
  });
});
// Logout
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) {
      console.error(err);
      return next(err);
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
  });
});
// 404 page
router.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

module.exports = router;
