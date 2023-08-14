const mongoose = require("mongoose");

const oceanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "해변가 이름을 적어주세요"],
    unique: true,
    trim: true,
    maxlength: [40, "해변가 이름은 40단어 이하입니다."],
  },
});

const Ocean = mongoose.model("Ocean", oceanSchema);

module.exports = Ocean;
