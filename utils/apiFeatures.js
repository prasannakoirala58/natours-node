class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // BUILD QUERY
    // 1) a) Filtering
    const queryObj = { ...this.queryString }; // creates new object instead of referencing req.query
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1) b) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    //API FILTERING - METHOD 1
    this.query = this.query.find(JSON.parse(queryStr));

    // API FILTERING - METHOD 2
    // const tours = await Tour.find().where("duration").equals(5).where("difficulty").equals("easy");

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      // console.log(this.queryString.sort); ["duration", "price"]
      // this console.log above creates an array of strings and split only works on strings
      // hence error occurs. Hackers use this to exploit the system. Fix is using hpp package.
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;
