const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
app.use(cookieParser());

// Setting pug template engine for express
app.set('view engine', 'pug');
// path gets the absolute path of the current directory of the file
// __dirname is a global variable that holds the absolute path of the current directory
// It is always not known that the path has a slash or not and thus room for a bug
// path.join is used to get path of any directory in any part
app.set('views', path.join(__dirname, 'views'));

// CORS
app.use(
  cors({
    origin: '*', // that will for all like  https / http
  })
);

// 1) GLOBAL MIDDLEWARES
// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public/js')));

// Set Security HTTP headers using helmet package from github.
// See the github docs for helmet for more info on security headers for your apps.
app.use(helmet());

// Development logging using morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, Please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from the body into req.body in json format
app.use(express.json({ limit: '90kb' }));
app.use(express.urlencoded({ extended: true, limit: '90kb' }));

// Data sanitaization against NoSQL query injection
//
// Using mongoSanitize npm package is enough to prevent from NoSQL query injection
// This middleware looks at the request body, request query and also the request
// params and if any of them contains a NoSQL query
// injection(basically $ and . dollars and dots), it will remove it.
app.use(mongoSanitize());

// Data sanitaization against XSS(Cross-site scripting) attacks
//
// If some malicious user tries to inject script tags in the request body,
// this middleware will remove it.
app.use(xss());

// Prevent parameter pollution
//
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Compression middleware (to compress our responses to the client)
app.use(compression()); //

// Test middleware used in the beggining of the app. Still here because sometimes
// some testing might be needed to be done before the app is deployed.
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies); // jwt constantly logged bhai rako yei line ley ho
  next();
});

// 3) ROUTES
// MOUNTING ROUTERS
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// This error handler works because it executes at last in out middleware
// stack when all the handlers above does not match with our api request url
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`), 404);
});

app.use(globalErrorHandler);

// EXPORT EXPRESS FOR SERVER START
module.exports = app;
