const express = require('express');
// Destructuring what to get from userController in variable names
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe,
  uploadUserPhoto,
  resizeUserPhoto,
} = require('./../controllers/userController');

// these are different ways to require a module in another file.
// authController is used to sign up users in our applications and does not follow REST Convention
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// All the routes below this line are protected routes and only
// authenticated(logged in) users can access them
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword); //update password
router.get('/me', getMe, getUser); // get your own information
router.patch('/updateMe', uploadUserPhoto, resizeUserPhoto, updateMe); // update your information
router.delete('/deleteMe', deleteMe); // delete your information

// The routes below this line is only accessible to admins.
router.use(authController.restrictTo('admin'));

// userController routes follow REST Convention 100%
router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
