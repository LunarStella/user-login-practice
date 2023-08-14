const Ocean = require("./../models/oceanModel");
const catchAsync = require("./../utils/catchAsync");

exports.getAllOceans = catchAsync(async (req, res) => {
  const oceans = await Ocean.find();

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    results: oceans.length,
    data: {
      oceans,
    },
  });
});

exports.createOcean = catchAsync(async (req, res, next) => {
  const oceans = await Ocean.create(req.body);

  res.status(201).json({
    status: "success",
    data: {
      data: oceans,
    },
  });
});
