const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");

// JWT 토큰 생성 함수
const signToken = (id) => {
  //{id: id} 같음
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// 토큰 생성 후 쿠키로 전달
const createSendToken = (user, statusCode, res) => {
  // user._id 기반 토큰 생성
  const token = signToken(user._id);

  // <FIX REQUIRED>
  // 세션 쿠키, 지속 쿠키 생각, 로그아웃 시 토큰 어떻게 설정 할까 생각
  // 쿠키 옵션 설정

  // const cookieOptions = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //   ),
  //   httpOnly: true,
  // };

  // if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  // res.cookie("jwt", token, cookieOptions);
  //<--FIX>

  // 전송할 데이터에 비밀번호 없애기
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

// 회원가입
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // 토큰 생성 후 쿠키에 전달
  createSendToken(newUser, 201, res);
});

// 이메일과 비밀번호를 통한 로그인
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) 이메일이나 패스워드를 입력했는지 확인
  if (!email || !password) {
    return next(new AppError("이메일 혹은 비밀번호를 입력해주세요", 400));
  }

  // 2) user 이메일이 존재하는지 확인
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("해당 이메일은 존재하지 않습니다.", 401));
  }

  // 3) user 비밀번호가 맞는지 확인
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("비밀번호가 맞지 않습니다.", 401));
  }

  // 토큰 생성 후 쿠키에 전달
  createSendToken(user, 201, res);
});

// 로그아웃 후 로그아웃 시간 기록
exports.logout = catchAsync(async (req, res, next) => {
  req.user.logoutAt = Date.now() - 1000;

  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({
    status: "success",
    message: "로그아웃 되었습니다.",
  });
});

// 적합한 유저인지 확인
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  // 1) 토큰이 header에 존재하면 가져오기
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 토큰 x
  if (!token) return next(new AppError("로그인 상태가 아닙니다.", 401));

  // 2) 토큰이 유효한지 확인
  // 여기서 틀리면 자체 오류 생성
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) 토큰에 있는 유저가 존재하는지 확인
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError("유저가 존재하지 않습니다."));

  // 4) 유저가 로그아웃 전에 받은 토큰인지 확인
  if (currentUser.logoutAfterCompare(decoded.iat)) {
    return next(new AppError("로그인 해주세요", 401));
  }

  // 5) 유저가 토큰을 발행 후 비밀번호를 바꿔는지 확인
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError("최근에 비밀번호를 바꾸었습니다. 다시 로그인 해주세요.", 401)
    );

  req.user = currentUser;
  next();
});

// 패스워드 까먹음
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) 이메일이 존재하는지 확인
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("이메일이 존재하지 않습니다. ", 404));
  }

  // 2) 랜덤 reset code 생성
  const resetToken = user.createPasswordResetToken();
  //reset code 유효시간 저장
  await user.save({ validateBeforeSave: false });

  // 3) reset code 메일 전송
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `비밀번호를 잊어버렸나요?비밀번호를 초기화하기 하기를 원하신다면 ${resetURL} 을 클릭해주세요. `;

  try {
    // 이메일 전송
    await sendEmail({
      email: user.email,
      subject: "패스워드 초키화 토큰이 메일로 전송되었습니다. (유효기간 10분)",
      message: message,
    });

    // 이메일 전송시 성공하면 전송
    res.status(200).json({
      status: "success",
      message: "이메일로 전송되었습니다.",
    });
  } catch (err) {
    // 이메일 전송 실패 시 에러 처리
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("이메일 전송중에 에러가 발생했습니다. 다시 시도해 주세요"),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) token을 통해 유저 찾기
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    // <FIX Required>시간 초과시 오류 메세지 만들어야 함
    passwordResetExpires: { $gt: Date.now() },
  });

  // 유저 비밀번호 초기화
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) 유저 다시 로그인 필요
  res.status(201).json({
    status: "success",
    message: "다시 로그인 해주세요",
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) collection 에서 user 가져오기
  const user = await User.findById(req.user.id).select("+password");

  // 2) 유저가 입력한 비밀번호와 DB 비밀번호 비교
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("비밀번호가 틀렸습니다.", 401));
  }

  // 3) 비밀번호가 맞다면 새로운 비밀번호 update
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) 유저 다시 로그인 필요
  res.status(201).json({
    status: "success",
    message: "다시 로그인 해주세요",
  });
});
