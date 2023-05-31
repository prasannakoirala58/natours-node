const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourID);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourID}&user=${
      req.user.id
    }&price=${tour.price}`,
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

// yo function ma if tyo bela tour user ra price define cha vane
// booking create garne ani homepage ma redirect garne. So basically tyo Book Now
// button click garera yesma redirect gareko cha vane tyo bela yesma booking create
// garne ani homepage ma redirect garne. But etikai homepage ma cha vane tyo bela
// define vako hunna tour, user, price variables so next() call vayera ani arko middleware
// ma gayo
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  // console.log(req.query);
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

// Payment Succeeds:           4242 4242 4242 4242
// Payment requires auth:      4000 0025 0000 3155
// Payment is declined:        4000 0000 0000 9995
