const express = require("express");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const gloabalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const oceanRouter = require("./routes/oceanRoutes");

const app = express();

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// json 데이터 파싱 및 10kb로 제한
app.use(express.json({ limit: "10kb" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/oceans", oceanRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));
});

app.use(gloabalErrorHandler);

module.exports = app;
