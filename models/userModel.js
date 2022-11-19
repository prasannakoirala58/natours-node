const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Always follow fat model and thin controllers philosophy(dherai logic model ma thorai controller ma)
// create a schema for user model with five fields (name, email, photo, password, passwrordConfirm)
// just like in the tour model

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please tell us your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    default: 'user',
    enum: ['guide', 'lead-guide', 'admin', 'user'],
  },
  password: {
    type: String,
    required: [true, 'Please set a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password; // if el(passwordConfirm) === this.password(password) true(valid)
      },
      message: 'Passwords do not match!',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // Only runs this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12, higher the cost more the time to encrypt password
  this.password = await bcrypt.hash(this.password, 12); // 12 is the cost paramenter cpu cost.

  // Delete the passwordConfirm field because it is only required as an input but not required
  // to persist as multiple fields in the database hence we delete the passwordConfirm field.
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query because of the
  //^find and the fact that it is a query middleware
  //
  // find all the users that are not active
  // $ne is not equal to
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  // console.log("Pekay don");

  // False means password not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // Creates a random string that will be used as a token to reset the password
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Save the reset token to the user model's passwordResetToken schema field
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  console.log({ resetToken }, this.passwordResetToken);

  // Then save the expiry date of the token to the passwrordResetExpires schema field
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // return the unencrypted reset token via email to the user
  // so that they can use it to reset their password but save the encrypted version to the database
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
