const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "이메일을 입력해주세요"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "옳바른 형식의 이메일을 입력해주세요"],
  },
  password: {
    type: String,
    required: [true, "비밀번호를 입력해주세요"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "비밀번호 확인을 입력해주세요"],
    validate: {
      //새로 create save시에만 작동
      // password와 똑같은지 check
      validator: function(el) {
        return el === this.password; //
      },
      message: "비밀번호가 같지 않습니다.",
    },
  },
  passwordChangeAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  logoutAt: Date,
});

// 비밀번호가 바뀌었을 시 실행, 패스워드 확인 삭제
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  //패스워드 확인 삭제
  this.passwordConfirm = undefined;
  next();
});

// 비밀번호가 바뀐적이 있다면 바뀌었던 시간 기록
userSchema.pre("save", function(next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangeAt = Date.now() - 1000;

  next();
});

//암호화된 비밀번호와 사용자 입력 비밀번호 비교 true false 반환
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// 로그아웃 후 생성 된 토큰인지 확인
userSchema.methods.logoutAfterCompare = function(JWTTimeStamp) {
  //로그아웃 전에 받은 토큰인지 체크, 토큰 생성 시간 < 로그아웃 시간 => 옳지 않은 토큰
  if (this.logoutAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }

  // 로그아웃 후에 받은 토큰임
  return false;
};

// 비밀번호 변경 후 생성 된 토큰인지 확인
userSchema.methods.changedPasswordAfter = function(JWTTimeStamp) {
  //비번이 바뀐 후 토큰 생성함, 토큰 생성 시간 < 비번 바뀐 시간 => 옳지 않은 토큰
  if (this.passwordChangeAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }

  // 비밀번호가 바뀐적 없음
  return false;
};

// 비밀번호 reset을 위한 코드
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // DB에는 암호화한 후 저장
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 생성 후 reset 코드 10분 유효
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
