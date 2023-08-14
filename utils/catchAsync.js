module.exports = (fn) => {
  return (req, res, next) => {
    //fn(req, res, next).catch(err => next(err)) : same
    fn(req, res, next).catch(next);
  };
};
