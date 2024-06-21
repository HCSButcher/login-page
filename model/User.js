const mongoose= require('mongoose')
const Schema = mongoose.Schema;

const userSchema= new Schema ({
  name: {
    type: String,
    required: false
  },  
  email: {
    type: String,
    required: true,
    unique: true  
  },
  password:{
    type: String,
    required: false
  },
  phone_number: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: false
  },
  registration_number: {
    type: String,
    required: false
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date,
  },
  date : {
    type: Date,
    default: Date.now
  },
  
});

const User = mongoose.model('user', userSchema);
module.exports= User;