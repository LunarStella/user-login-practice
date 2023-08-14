const nodemailer = require("nodemailer");

// 송신자와 이메일 전송 함수
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 이메일 옵션 정의
  const mailOptions = {
    from: "Jimmy Kang <hello@jimmy.io>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 실제 메일 전송
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
