const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourID);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    success_url: `${req.protocol}://${req.get('host')}/`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    client_reference_id: req.params.tourID, // this is the id of the product that the user is purchasing
    currency: 'usd', // this is the currency that the user will pay in
    payment_method_types: ['card'],
    customer_email: req.user.email,
    mode: 'payment',
    // expires_at: Math.round(Date.now() / 1000) + 60, // 1 minutes

    // this field is the information about the product that the user is purchasing
    // and this information will be displayed in the stripe checkout page
    line_items: [
      {
        // price: tour.price * 100, // price is in cents,
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100, // price is in cents,
          // product: tour.id, // this is the id of the product that the user is purchasing
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3) Create session as response adn redirect to url
  res.status(200).json({
    status: 'success',
    session,
  });
});

// Payment Succeeds:           4242 4242 4242 4242
// Payment requires auth:      4000 0025 0000 3155
// Payment is declined:        4000 0000 0000 9995
