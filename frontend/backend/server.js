// python import랑 동일
const express = require("express");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");

const app = express();
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (public/index.html 접근 가능)
app.use(express.static("public"));

// 업로드된 파일 접근 가능
app.use("/uploads", express.static("uploads"));

// MongoDB 정보
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

// MongoDB Collection 이름 (전역 함수)
let imagesCollection;
let loginCollection;

//MongoDB 정보 기반 연결
async function connectDB() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");
    const db = client.db("diary"); // DB 이름
    imagesCollection = db.collection("images"); // 컬렉션 이름
    loginCollection = db.collection("login");
  } catch (err) {
    console.error("❌ DB 연결 에러:", err);
  }
}
connectDB();

// 로그인 정보 일치여부 확인
async function loginCheck(id, pw) {
  try {
    const user = await loginCollection.findOne({ id });
    if (!user) {
      return { seccess: false, msg: "존재하지 않는 사용자입니다." };
    }

    const isMatch = await bcypt.compare(pw, user.password);
    if (!isMatch) {
      return { success: false, msg: "비밀번호가 올바르지 않습니다." };
    }

    return { success: true, msg: "로그인 성공", user };
  } catch (err) {
    console.error("Error(Login check) :", err);
    return { success: false, msg: "server error" };
  }
}

// 회원가입 함수
async function registerLogin(id, pw) {
  const exist = await loginCollection.findOne({ id });
  if (exist) return { success: false, msg: "이미 존재하는 사용자입니다." };

  const hased = await bcrypt.hash(pw, 10);
  await loginCollection.insertOne({ id, password: hashed });
  return { success: true, msg: "회원가입 완료" };
}

// 이미지에서 GPS 및 날짜 정보 추출
async function extractImgInfo(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    const lat = result.tags.GPSLatitude;
    const lon = result.tags.GPSLongitude;
    const latRef = result.tags.GPSLatitudeRef;
    const lonRef = result.tags.GPSLongitudeRef;

    let latitude = lat ? (latRef === "S" ? -lat : lat) : null;
    let longitude = lon ? (lonRef === "W" ? -lon : lon) : null;

    const date = result.tags.CreateDate
      ? new Date(result.tags.CreateDate * 1000).toISOString()
      : null;

    return {
      sucess: true,
      latitude,
      longitude,
      date,
      gasGPS: latitude !== null && longitude !== null,
    };
  } catch (error) {
    console.error("EXIF img error :", error);
    return { success: false, msg: "다른 사진을 입력하세요."};
  }
}

// 파일 저장 경로 + 파일명
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // 저장할 폴더
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // 파일명: timestamp + 확장자
  },
});
const upload = multer({ storage });

// 이미지 업로드
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "❌ 파일이 업로드되지 않았습니다." });
    }

    const imageUrl = "/uploads/" + req.file.filename;

    // DB에 이미지 경로 저장
    const result = await imagesCollection.insertOne({ imageUrl });

    res.json({
      message: "✅ 업로드 성공",
      imageUrl,
      dbResult: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 업로드된 이미지 목록 조회
app.get("/images", async (req, res) => {
  const images = await imagesCollection.find().toArray();
  res.json(images);
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
