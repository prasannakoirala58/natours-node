const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

// CREATING ROUTER
const router = express.Router();

// CHECK IF THE ID IS VALID OR NOT PARAM MIDDLEWARE
// router.param("id", tourController.checkID);

// POST /tours/23423/reviews
// GET /tours/23423/reviews

// This route is kind of like reviews routes inside tour routes as reviews only belongs to tour.
// This is mounting the reviewRouter to the tourRouter router is tour router
// and reviewRouter is mounted to tourRouter router when '/:tourId/reviews' url is requested
router.use('/:tourId/reviews', reviewRouter);

router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi is
// url specified using query string but this way of above looks clean and easy to read.
// example:
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi is url specified using path params which is standard.

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// ROUTES
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guides'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
