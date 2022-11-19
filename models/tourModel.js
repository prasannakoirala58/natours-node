const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const validator = require("validator");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, // trims all the whitespaces in the beginning and end of string
      maxlength: [40, 'A tour name must have less or equal to 40 characters'],
      minlength: [10, 'A tour name must have more or equal to 40 characters'],
      // validate: [validator.isAlpha, "Tour name must only contain characters"],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or hard',
      },
    },
    ratingsAverage: {
      type: Number,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      default: 4.5,
      set: (val) => Math.round(val * 10) / 10,
      // set is used to set the value on save
      // and Math.round() roundsthe ratingsAverage to nearest integer which is a problem as
      // we might get ratings in float too. So if ratingsAvg is 4.667 then it will be rounded
      // to 5.0. To fix this we multiply 4.667 by 10 and it is  46.667 and then we round it to
      // 47 using Math.round and then divide it by 10;
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // "this" here only points to current doc on NEW document creation, not on update document
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON is a special data file used by mongodb to store geo data
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // An array like in locations always needs to be an array of objects to create
    // embedded documents
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // key line that creates reference between User and Tour
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// virtuals are not stored in the database. They are just a way to access data
// without having to query the database. They are useful for things like
// displaying data in the frontend without having to query the database.
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// This will allow us to solve the
// problem in which we have to query the database for each tour to get
// the user data and the review data. Instead, we can query the database
// only once and then populate the user data in the tour model. Also what
// it helps with is that we need child referencing and reference all the
// reviews in a certain tour but that review number may grow upto very large
// and app slow huncha performance less huncha euta matra document chai ekdam
// thulo vayesi tesaile hami yo virtual populate use garcham.
// Virtual Populate
// This allows us to basically keep all the reference to the child documents
// on the parent documents but without persisiting it to the database ie virtual
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  // foreign stores the id of the tour(current model) in the review model
  localField: '_id', // local stores the actually stores id of the tour in the review model
  // this _id is called tour, stores tour id in foreign(in this case review) model
});

// Document Middleware - runs before .save() and .create(), remove(), validate() command but not on insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre("save", function (next) {
//   console.log("Will save document...");
//   next();
// });

// tourSchema.post("save", function (doc, next) {
//   console.log(doc);
//   next();
// });

// Query Middleware
// tourSchema.pre("find", function (next) {
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// Aggregation Middleware
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
