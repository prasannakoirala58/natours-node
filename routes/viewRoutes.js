const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

// Fix to error message while trying to load mapbox
const CSP = 'Content-Security-Policy';
const POLICY =
  "default-src 'self' https://*.mapbox.com ;" +
  "base-uri 'self';block-all-mixed-content;" +
  "font-src 'self' https: data:;" +
  "frame-ancestors 'self';" +
  "img-src http://localhost:8000 'self' blob: data:;" +
  "object-src 'none';" +
  "script-src https: cdn.jsdelivr.net cdnjs.cloudflare.com api.mapbox.com 'self' blob: ;" +
  "script-src-attr 'none';" +
  "style-src 'self' https: 'unsafe-inline';" +
  'upgrade-insecure-requests;';

const router = express.Router();

// Fix to error message while trying to load mapbox
router.use((req, res, next) => {
  res.setHeader(CSP, POLICY);
  next();
});

// route for overview/root/home page
router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);

// route for a specific tour
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);

// login
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);

// accounts
router.get('/me', authController.protect, viewsController.getAccount);

// my bookings
router.get('/my-tours', authController.protect, viewsController.getMyTours);

//
router.post('/submit-user-data', authController.protect, viewsController.updateUserData);

module.exports = router;
