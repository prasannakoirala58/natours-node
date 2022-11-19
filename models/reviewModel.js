const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour', // yo line bata child reference create hunxa and populate garna sakeko hamle
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      // This is how child referencing is implemented.
      //Go to 2nd video of this section for complete details
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// compound index is used to create a unique index on tour and user combined.
// This is used to prevent duplicate reviews as one user with same tourId and userId
// can only write one review for that tour.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // The populate method adds extra queries behind the scenes to relate to database and query
  // is used in order to do that which might affect the performance of the app if used too many.

  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  // populate to tout is commented because it created indefinite chain of populates

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// This method statics calculates the average of all the ratings of a tour and
// stores it in the ratingsAverage field of the tour document. Also it updates
// the number of ratings in the ratingsQuantity field of the tour document
// using aggregation pipeline
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // 'this' points to current review here.
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate only has query middleware
// findByIdAndDelete only has query middleware

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here because query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
