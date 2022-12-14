const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    // this is converting the cookie expiry date which is 90 days in our config file
    // to milliseconds because that is what the cookie module expects and we convert
    // 90 days to milliseconds by multiplying it first by 24 hrs in a single day and
    // then 60 min in an hour and 60 seconds in a minute and then 1000 milliseconds
    // in a second which successfully converts out 90 days cookie expiry time to
    // milliseconds as code below.
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    // secure: true, only set to true if you are using https which will be in prod mode
    // after we deploy it to heroku
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // We can use the same method to create a cookie
  res.cookie('jwt', token, cookieOptions);

  // Here we do password undefined because we dont want it to be visible in the response body
  // while signing up a new user
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  //   const newUser = await User.create(req.body);
  // if we use the above line of code here, we will have a serious authentication issue which is
  // that we create a new user using all the data that is coming in with the body of the request
  // and the problem is anyone here can specify the role as an admin and we dont want to let any
  // user become admin to our app. The code below is the replacement for line num 5 and this will
  // fix this any user able to be the admin problem in our application.
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password actually exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists & password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything is ok, send token to the client
  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.clearCookie('jwt');
  // res.cookie('jwt', 'loggedout', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true,
  // });
  res.status(200).json({ status: 'success' });
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token and check if it exists or if it is there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  //   console.log(token);

  if (!token) {
    return next(new AppError('You are not logged in! Please login to get access.', 401));
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(token);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token does no longer exist!', 401));
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again.', 401));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages means no errors will be there so no need to check for errors.
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // Verify token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THis means that there is a LOGGED IN USER.
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  next();
};

exports.restrictTo = (...roles) => {
  // This method follows the power of closure.
  return (req, res, next) => {
    // roles["admin", "lead-guides"] role='user'
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email address.', 404));
  }

  // 2) Generate the random reset token
  // reset token method creates a random string of length that will help
  // user to reset their password
  const resetToken = user.createPasswordResetToken();
  // this turns all the validators off for the user so that they can proceed to reset their password
  await user.save({ validateBeforeSave: false });

  // 3) Send the reset token to the user's email.
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password 
  and passwordConfirm to: ${resetURL}.\n If you didn't forget your password, please
  ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!'), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired'), 400);
  }
  /* if the user's token has not expired then simply set the new password
  // and remove the token and expiry date from the user's field in the db
  // and save the user to the db and send a success message. This is the 
  // replacement for line num 32 and 33 in the code below and this will 
  // fix the issue of the user being able to reset their password after 
  // the token has expired. */
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // when we dont pass the validateBeforeSave: false option then the password
  // and passwordConfirm is compared and validated thus making the validation
  // feature work. save() method runs all the validators but not other methods run them.
  await user.save();

  // 3) Update the changedPasswordAt property for the current user

  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Update the password if the password is correct
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // Here User.findByIdAndUpdate will not work as intended!

  // 4 ) Log user in, send JWT with for updated password
  createSendToken(user, 200, res);
});
