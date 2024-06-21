const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session')
const flash = require('connect-flash');
const dotenv = require('dotenv');
const async = require('async')
const bodyparser = require('body-parser');
const app = express();

//load environment variables from .env file
dotenv.config();

//passport configuration
require('./config/passport')(passport);


//register view engine (npm install ejs)
app.set ('view engine', 'ejs');

const routes = require('./routers/routes')
const dbuRI = (' add mongodb connection string')
 mongoose.connect(dbuRI)
 .then(result=> app.listen(3001), console.log('Database connected'))
 .catch((err)=>{
   console.log(err)
   });
   console.log('server listening'); 
   
   
   //express session
   app.use(session({
     secret: 'secret',
     resave: false,
     saveUninitialized: true
     }));
     //connect flash
     app.use(flash());
     
     //global varables
     app.use((req,res, next) => {
       res.locals.success_msg = req.flash('success_msg');
       res.locals.error_msg = req.flash('error_msg');
       res.locals.error = req.flash('error');
       res.locals.searchResults = [];
       next();
       });
       


       //for conversion in between the data
       app.use(express.urlencoded({ extended: false}));
       app.use(express.json());
       app.use(morgan('Dev'));
       
       //for bodyparser middlewear
       app.use(bodyparser.urlencoded({ extended: false}));

       //express body parser for static files
       app.use(express.static('public'));

       //passport middleware
       app.use(passport.initialize());
       app.use(passport.session());

   //access server from client side
   app.use(cors());
   
   //routing
   app.use(routes);