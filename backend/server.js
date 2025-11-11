const express = require("express");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");
const bcrypt = require("bcrypt");

const app = express();
require("dotenv").config();


// ✅ 프론트엔드(Next.js)와 연결할 수 있도록 CORS 허용
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ai-diary-merge.vercel.app",
      "https://ai-diary27.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 정적 파일 제공
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ✅ MongoDB 연결 설정
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let imagesCollection, loginCollection, diariesCollection;

// ✅ DB 연결 후 서버 시작
async function connectDB() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("diary");
    imagesCollection = db.collection("images");
    loginCollection = db.collection("login");
    diariesCollection = db.collection("diaries");

    // ✅ uploads 폴더 확인 및 생성 (Windows 호환)
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
      console.log("📁 uploads 폴더 생성됨");
    }

    // ✅ 서버는 DB 연결 완료 후 실행
    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ DB 연결 실패:", err);
    console.error("💡 MongoDB가 실행 중인지 확인하세요: net start MongoDB");
  }
}
connectDB();

// ✅ 회원가입 함수
async function registerLogin(email, password) {
  const exist = await loginCollection.findOne({ email });
  if (exist) return { success: false, msg: "이미 존재하는 사용자입니다." };

  const hashed = await bcrypt.hash(password, 10);
  await loginCollection.insertOne({
    email,
    password: hashed,
    username: email.split("@")[0],
    provider: "email",
    createdAt: new Date(),
  });

  return { success: true, msg: "회원가입 완료" };
}

// ✅ 로그인 검사 함수
async function loginCheck(email, password) {
  const user = await loginCollection.findOne({ email });
  if (!user) return { success: false, msg: "존재하지 않는 사용자입니다." };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return { success: false, msg: "비밀번호가 올바르지 않습니다." };

  return {
    success: true,
    msg: "로그인 성공",
    user: {
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    },
  };
}

// ✅ [POST] 회원가입 API (수정됨)
app.post("/api/register", async (req, res) => {
  console.log("📥 회원가입 요청:", req.body);
  const { email, password } = req.body;

  // ✅ 입력값 검증
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: "이메일과 비밀번호를 입력해주세요." 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      error: "비밀번호는 6자 이상이어야 합니다." 
    });
  }

  const result = await registerLogin(email, password);
  
  // ✅ 응답 형식 통일
  if (result.success) {
    console.log("✅ 회원가입 성공:", email);
    res.json({
      success: true,
      user: {
        email: email,
        username: email.split("@")[0],
        createdAt: new Date(),
      },
      message: "회원가입 완료"
    });
  } else {
    console.log("❌ 회원가입 실패:", result.msg);
    res.status(400).json({
      success: false,
      error: result.msg
    });
  }
});

// ✅ [POST] 로그인 API
app.post("/api/login", async (req, res) => {
  console.log("📥 로그인 요청:", req.body);
  const { email, password } = req.body;
  const result = await loginCheck(email, password);
  
  if (result.success) {
    res.json({
      success: true,
      user: result.user,
      message: result.msg
    });
  } else {
    res.status(401).json({
      success: false,
      error: result.msg
    });
  }
});

// ✅ [POST] Google 로그인/회원가입 API (MongoDB Cloud 호환)
app.post("/api/google-login", async (req, res) => {
  console.log("📥 Google 로그인 요청:", req.body);
  const { email, name, picture } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: "이메일이 필요합니다." });
  }

  try {
    // ✅ 1. 기존 사용자 확인
    let user = await loginCollection.findOne({ email });

    if (!user) {
      // ✅ 2. 새 사용자 생성 (Google 로그인은 비밀번호 없음)
      const newUser = {
        email,
        username: name || email.split("@")[0],
        picture: picture || null,
        provider: "google",
        createdAt: new Date(),
      };
      
      // ✅ 3. 삽입 후 결과 확인
      const insertResult = await loginCollection.insertOne(newUser);
      
      if (!insertResult.insertedId) {
        console.error("❌ MongoDB insertOne 실패");
        return res.status(500).json({ 
          success: false, 
          msg: "사용자 생성에 실패했습니다. MongoDB 연결을 확인하세요." 
        });
      }

      user = {
        ...newUser,
        _id: insertResult.insertedId
      };
      console.log("✅ 새 Google 사용자 생성:", email, "ID:", insertResult.insertedId);
    } else {
      console.log("✅ 기존 Google 사용자 로그인:", email);
      // ✅ 4. 기존 사용자의 프로필 사진 업데이트 (선택사항)
      if (picture && user.picture !== picture) {
        const updateResult = await loginCollection.updateOne(
          { email },
          { $set: { picture: picture, updatedAt: new Date() } }
        );
        
        if (updateResult.modifiedCount > 0) {
          user.picture = picture;
          console.log("✅ 프로필 사진 업데이트됨");
        }
      }
    }

    // ✅ 5. 성공 응답
    res.json({
      success: true,
      msg: "Google 로그인 성공",
      user: {
        email: user.email,
        username: user.username,
        picture: user.picture,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Google 로그인 에러:", error);
    console.error("❌ 에러 상세:", error.message);
    res.status(500).json({ 
      success: false, 
      msg: "서버 오류가 발생했습니다.",
      error: error.message
    });
  }
});

// ✅ 이미지 EXIF 추출
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
      success: true,
      latitude,
      longitude,
      date,
      hasGPS: latitude !== null && longitude !== null,
    };
  } catch (error) {
    console.error("EXIF img error:", error);
    return { success: false, msg: "다른 사진을 입력하세요." };
  }
}

// ✅ multer로 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const { userId, keywords, tempSlotId } = req.body
    
    // 이미지를 Base64로 변환
    const imageBuffer = fs.readFileSync(req.file.path)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = req.file.mimetype  // 예: 'image/jpeg'
    
    const exifData = await extractImgInfo(req.file.path)

    // ✅ MongoDB에 저장
    const result = await imagesCollection.insertOne({
      userId,
      imageData: base64Image,  // Base64 데이터
      mimeType: mimeType,      // 이미지 타입
      keywords: keywords ? JSON.parse(keywords) : [],
      tempSlotId: tempSlotId || Date.now().toString(),
      exifData,
      usedInDiary: false,
      createdAt: new Date(),
    })

    // ✅ 파일 삭제 (더 이상 필요 없음)
    fs.unlinkSync(req.file.path)

    res.json({ 
      message: "✅ 업로드 성공", 
      imageId: result.insertedId,
      imageData: base64Image,
      mimeType: mimeType,
      exifData,
      tempSlotId: tempSlotId || Date.now().toString()
    })
  } catch (err) {
    console.error("❌ 업로드 오류:", err)
    res.status(500).json({ error: err.message })
  }
})

// ✅ [GET] 사용자별 일기 조회 API
app.get("/api/diaries/:userId", async (req, res) => {
  const { userId } = req.params;
  const diaries = await imagesCollection.find({ userId }).toArray();
  res.json(diaries);
});

app.post("/api/diaries", async (req, res) => {
  console.log("📥 다이어리 생성 요청:", req.body);
  const { userId, title, date, photoSlotIds } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: "userId와 title이 필요합니다." });
  }

  try {
    // ✅ 1. photoSlotIds로 images 컬렉션에서 사진 가져오기
    let photoSlots = [];
    
    console.log("📷 받은 photoSlotIds:", photoSlotIds);
    
    if (photoSlotIds && photoSlotIds.length > 0) {
      const { ObjectId } = require("mongodb");
      const imageIds = photoSlotIds
        .filter(id => id && id !== 'temp')
        .map(id => {
          try {
            return new ObjectId(id);
          } catch (e) {
            console.error(`❌ 잘못된 ObjectId: ${id}`, e);
            return null;
          }
        })
        .filter(id => id !== null);

      console.log("📷 변환된 ObjectIds:", imageIds);

      if (imageIds.length > 0) {
        const images = await imagesCollection.find({
          _id: { $in: imageIds }
        }).toArray();

        console.log(`✅ ${images.length}개의 이미지 조회됨`);
        console.log("📷 조회된 이미지들:", JSON.stringify(images, null, 2));

        // ✅ 2. photoSlots 형식으로 변환 (Base64 이미지 포함)
        photoSlots = images.map((img, index) => ({
          id: img._id.toString(),
          photo: `http://localhost:3001${img.imageUrl}`,
          imageData: img.imageData,  // ✅ Base64 데이터 추가
          mimeType: img.mimeType,    // ✅ 이미지 타입 추가
          keywords: img.keywords || [],
          timeSlot: img.exifData?.date ? getTimeSlot(new Date(img.exifData.date)) : "evening",
          timestamp: img.exifData?.date ? new Date(img.exifData.date).getTime() : Date.now(),
          exifData: {
            timestamp: img.exifData?.date ? new Date(img.exifData.date) : new Date(),
            location: img.exifData?.latitude && img.exifData?.longitude ? {
              latitude: img.exifData.latitude,
              longitude: img.exifData.longitude,
            } : undefined,
          }
        }));

        console.log("📷 생성된 photoSlots:", JSON.stringify(photoSlots, null, 2));

        // ✅ 3. images 컬렉션에서 usedInDiary를 true로 표시
        await imagesCollection.updateMany(
          { _id: { $in: imageIds } },
          { $set: { usedInDiary: true } }
        );
      } else {
        console.warn("⚠️ 유효한 imageIds가 없습니다");
      }
    } else {
      console.warn("⚠️ photoSlotIds가 비어있습니다");
    }

    // ✅ 4. 다이어리 생성
    const newDiary = {
      userId,
      title,
      date: date || new Date().toLocaleDateString(),
      photoSlots,
      createdAt: new Date(),
    };

    console.log("📝 저장할 다이어리:", JSON.stringify(newDiary, null, 2));

    const result = await diariesCollection.insertOne(newDiary);

    console.log("✅ 다이어리 저장 완료, ID:", result.insertedId);

    res.json({
      success: true,
      message: "✅ 다이어리 생성 완료",
      diary: {
        ...newDiary,
        _id: result.insertedId,
      },
    });
  } catch (err) {
    console.error("❌ 다이어리 생성 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Helper: 시간대 계산
function getTimeSlot(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 15) return "midday";
  if (hour >= 15 && hour < 18) return "afternoon";
  return "evening";
}

// ✅ [GET] 사용자별 다이어리 목록 조회 API
app.get("/api/diaries/list/:userId", async (req, res) => {
  console.log("📥 다이어리 목록 조회:", req.params.userId);
  const { userId } = req.params;

  try {
    const diaries = await diariesCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ ${diaries.length}개의 다이어리 조회됨`);
    
    res.json({
      success: true,
      data: diaries 
    });
  } catch (err) {
    console.error("❌ 다이어리 조회 오류:", err);
    
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ✅ [DELETE] 다이어리 삭제 API
app.delete("/api/diaries/:diaryId", async (req, res) => {
  console.log("📥 다이어리 삭제 요청:", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");
    const result = await diariesCollection.deleteOne({
      _id: new ObjectId(diaryId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "다이어리를 찾을 수 없습니다." });
    }

    res.json({ success: true, message: "✅ 다이어리 삭제 완료" });
  } catch (err) {
    console.error("❌ 다이어리 삭제 오류:", err);
    res.status(500).json({ error: err.message });
  }
});