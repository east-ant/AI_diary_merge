const express = require("express");
const { MongoClient } = require("mongodb");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const ExifParser = require("exif-parser");
const bcrypt = require("bcrypt");
const printController = require("./controllers/print-controller");

const app = express();
require("dotenv").config();

app.use(cors({
  origin: ["http://localhost:3000", "https://ai-diary-merge.vercel.app", "https://ai-diary27.vercel.app"],
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let imagesCollection, loginCollection, diariesCollection, printableDiaryCollection;

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected");

    const db = client.db("diary");
    imagesCollection = db.collection("images");
    loginCollection = db.collection("login");
    diariesCollection = db.collection("diaries");
    printableDiaryCollection = db.collection("printable_diaries");

    // 프린트 컨트롤러에 컬렉션 참조 전달
    printController.initializeCollections(diariesCollection, printableDiaryCollection);

    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
      console.log("📁 uploads 폴더 생성됨");
    }

    const PORT = 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ DB 연결 실패:", err);
  }
}
connectDB();

// 유틸리티 함수들
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
    const date = result.tags.CreateDate ? new Date(result.tags.CreateDate * 1000).toISOString() : null;

    return { success: true, latitude, longitude, date, hasGPS: latitude !== null && longitude !== null };
  } catch (error) {
    console.error("EXIF img error:", error);
    return { success: false, msg: "다른 사진을 입력하세요." };
  }
}

function getTimeSlot(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 15) return "midday";
  if (hour >= 15 && hour < 18) return "afternoon";
  return "evening";
}

// ==========================================
// 인증 관련 API
// ==========================================

app.post("/api/register", async (req, res) => {
  console.log("📥 회원가입 요청:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "이메일과 비밀번호를 입력해주세요." });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: "비밀번호는 6자 이상이어야 합니다." });
  }

  const result = await registerLogin(email, password);
  
  if (result.success) {
    console.log("✅ 회원가입 성공:", email);
    res.json({
      success: true,
      user: { email: email, username: email.split("@")[0], createdAt: new Date() },
      message: "회원가입 완료"
    });
  } else {
    res.status(400).json({ success: false, error: result.msg });
  }
});

app.post("/api/login", async (req, res) => {
  console.log("📥 로그인 요청:", req.body);
  const { email, password } = req.body;
  const result = await loginCheck(email, password);
  
  if (result.success) {
    res.json({ success: true, user: result.user, message: result.msg });
  } else {
    res.status(401).json({ success: false, error: result.msg });
  }
});

app.post("/api/google-login", async (req, res) => {
  console.log("📥 Google 로그인 요청:", req.body);
  const { email, name, picture } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: "이메일이 필요합니다." });
  }

  try {
    let user = await loginCollection.findOne({ email });

    if (!user) {
      const newUser = {
        email,
        username: name || email.split("@")[0],
        picture: picture || null,
        provider: "google",
        createdAt: new Date(),
      };
      
      const insertResult = await loginCollection.insertOne(newUser);
      
      if (!insertResult.insertedId) {
        return res.status(500).json({ success: false, msg: "사용자 생성에 실패했습니다." });
      }

      user = { ...newUser, _id: insertResult.insertedId };
      console.log("✅ 새 Google 사용자 생성:", email);
    } else {
      console.log("✅ 기존 Google 사용자 로그인:", email);
    }

    res.json({
      success: true,
      msg: "Google 로그인 성공",
      user: { email: user.email, username: user.username, picture: user.picture, createdAt: user.createdAt },
    });
  } catch (error) {
    console.error("❌ Google 로그인 에러:", error);
    res.status(500).json({ success: false, msg: "서버 오류가 발생했습니다." });
  }
});

// ==========================================
// 이미지 업로드 API
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    const { userId, keywords, tempSlotId } = req.body
    const imageBuffer = fs.readFileSync(req.file.path)
    const base64Image = imageBuffer.toString('base64')
    const mimeType = req.file.mimetype
    const exifData = await extractImgInfo(req.file.path)

    const result = await imagesCollection.insertOne({
      userId,
      imageData: base64Image,
      mimeType: mimeType,
      keywords: keywords ? JSON.parse(keywords) : [],
      tempSlotId: tempSlotId || Date.now().toString(),
      exifData,
      usedInDiary: false,
      createdAt: new Date(),
    })

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

// ==========================================
// 다이어리 관련 API (순서 중요!)
// ==========================================

// ✅ 1. POST 라우트들
app.post("/api/diaries", async (req, res) => {
  console.log("📥 다이어리 생성 요청:", req.body);
  const { userId, title, date, photoSlotIds } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: "userId와 title이 필요합니다." });
  }

  try {
    let photoSlots = [];
    
    if (photoSlotIds && photoSlotIds.length > 0) {
      const { ObjectId } = require("mongodb");
      const imageIds = photoSlotIds
        .filter(id => id && id !== 'temp')
        .map(id => {
          try {
            return new ObjectId(id);
          } catch (e) {
            return null;
          }
        })
        .filter(id => id !== null);

      if (imageIds.length > 0) {
        const images = await imagesCollection.find({ _id: { $in: imageIds } }).toArray();

        photoSlots = images.map((img) => ({
          id: img._id.toString(),
          photo: `http://localhost:3001${img.imageUrl}`,
          imageData: img.imageData,
          mimeType: img.mimeType,
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

        await imagesCollection.updateMany(
          { _id: { $in: imageIds } },
          { $set: { usedInDiary: true } }
        );
      }
    }

    const newDiary = {
      userId,
      title,
      date: date || new Date().toLocaleDateString(),
      photoSlots,
      createdAt: new Date(),
    };

    const result = await diariesCollection.insertOne(newDiary);

    res.json({
      success: true,
      message: "✅ 다이어리 생성 완료",
      diary: { ...newDiary, _id: result.insertedId },
    });
  } catch (err) {
    console.error("❌ 다이어리 생성 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/save-ai-diary", async (req, res) => {
  console.log("📥 AI 다이어리 저장 요청:", req.body);
  const { diaryId, userId, content, photoSlots } = req.body;

  try {
    const { ObjectId } = require("mongodb");
    const aiDiaryCollection = client.db("diary").collection("AI diary results");
    
    const objectIdDiaryId = new ObjectId(diaryId);
    
    const cleanPhotoSlots = photoSlots ? photoSlots.map(slot => {
      const { imageData, mimeType, ...rest } = slot;
      return rest;
    }) : [];
    
    const result = await aiDiaryCollection.insertOne({
      diaryId: objectIdDiaryId,
      userId,
      content,
      photoSlots: cleanPhotoSlots,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: "✅ AI 다이어리 저장 완료",
      aiDiaryId: result.insertedId,
    });
  } catch (err) {
    console.error("❌ AI 다이어리 저장 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/diaries/save-printable", async (req, res) => {
  console.log("📥 인쇄 다이어리 저장 요청");
  const { diaryId, userId, imageData } = req.body;

  if (!diaryId || !userId || !imageData) {
    return res.status(400).json({ success: false, error: "diaryId, userId, imageData가 필요합니다." });
  }

  try {
    const { ObjectId } = require("mongodb");
    const objectIdDiaryId = new ObjectId(diaryId);

    const printableDir = path.join(__dirname, "uploads/printable");
    if (!fs.existsSync(printableDir)) {
      fs.mkdirSync(printableDir, { recursive: true });
    }

    // imageData가 배열인지 확인 (여러 페이지)
    const imageDataArray = Array.isArray(imageData) ? imageData : [imageData];
    const savedFiles = [];

    for (let i = 0; i < imageDataArray.length; i++) {
      const base64Data = imageDataArray[i].includes(",")
        ? imageDataArray[i].split(",")[1]
        : imageDataArray[i];

      const fileName = `printable-${diaryId}-page${i + 1}-${Date.now()}.jpg`;
      const filePath = path.join(printableDir, fileName);
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      console.log(`✅ 인쇄 다이어리 파일 저장 (페이지 ${i + 1}):`, filePath);

      savedFiles.push({
        fileName: fileName,
        filePath: `/uploads/printable/${fileName}`,
        pageNumber: i + 1,
      });
    }

    const result = await printableDiaryCollection.insertOne({
      diaryId: objectIdDiaryId,
      userId,
      pages: savedFiles,
      pageCount: savedFiles.length,
      mimeType: "image/jpeg",
      createdAt: new Date(),
    });

    await diariesCollection.updateOne(
      { _id: objectIdDiaryId },
      { $set: { isCompleted: true, completedAt: new Date() } }
    );

    console.log(`✅ 인쇄 다이어리 저장 완료 (${savedFiles.length}페이지) + isCompleted 플래그 설정`);

    res.json({
      success: true,
      message: `✅ 인쇄 다이어리 저장 완료 (${savedFiles.length}페이지)`,
      printableDiaryId: result.insertedId,
      pages: savedFiles,
    });
  } catch (err) {
    console.error("❌ 인쇄 다이어리 저장 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/diaries/mark-complete", async (req, res) => {
  console.log("📥 다이어리 작성 완료 표시:", req.body);
  const { diaryId } = req.body;

  if (!diaryId) {
    return res.status(400).json({ success: false, error: "diaryId가 필요합니다." });
  }

  try {
    const { ObjectId } = require("mongodb");
    const objectIdDiaryId = new ObjectId(diaryId);

    const result = await diariesCollection.updateOne(
      { _id: objectIdDiaryId },
      { $set: { isCompleted: true } }
    );

    res.json({
      success: true,
      message: "✅ 다이어리 완료 상태 저장됨",
    });
  } catch (err) {
    console.error("❌ 완료 상태 저장 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 2. GET 라우트들 (구체적인 경로부터)
app.get("/api/diaries/list/:userId", async (req, res) => {
  console.log("📥 다이어리 목록 조회:", req.params.userId);
  const { userId } = req.params;

  try {
    const diaries = await diariesCollection.find({ userId }).toArray();
    diaries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ✅ 각 다이어리의 이미지 데이터 로드
    for (let diary of diaries) {
      if (diary.photoSlots && diary.photoSlots.length > 0) {
        const photoIds = diary.photoSlots.map(slot => {
          try {
            return new ObjectId(slot.id);
          } catch (e) {
            return slot.id;
          }
        }).filter(id => id);

        if (photoIds.length > 0) {
          const images = await imagesCollection.find({ _id: { $in: photoIds } }).toArray();

          diary.photoSlots = diary.photoSlots.map(slot => {
            const image = images.find(img => img._id.toString() === slot.id.toString());
            return {
              ...slot,
              imageData: image?.imageData,
              mimeType: image?.mimeType,
            };
          });
        }
      }
    }

    res.json({ success: true, data: diaries });
  } catch (err) {
    console.error("❌ 다이어리 조회 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/diaries/status/:diaryId", async (req, res) => {
  console.log("📥 다이어리 상태 조회:", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");
    const objectIdDiaryId = new ObjectId(diaryId);

    const diary = await diariesCollection.findOne(
      { _id: objectIdDiaryId },
      { projection: { isCompleted: 1 } }
    );

    if (!diary) {
      return res.status(404).json({ success: false, error: "해당 다이어리를 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      isCompleted: diary.isCompleted === true,
    });
  } catch (err) {
    console.error("❌ 다이어리 상태 조회 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/diaries/printable/:diaryId", async (req, res) => {
  console.log("📥 인쇄 다이어리 조회:", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");
    
    let printableDiary;
    
    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      printableDiary = await printableDiaryCollection.findOne({ diaryId: objectIdDiaryId });
    } catch (e) {
      console.log("⚠️ ObjectId 변환 실패, 문자열로 찾기");
    }

    if (!printableDiary) {
      printableDiary = await printableDiaryCollection.findOne({ diaryId: diaryId });
    }

    if (!printableDiary) {
      return res.status(404).json({
        success: false,
        error: "저장된 인쇄 다이어리가 없습니다.",
        hasPrintable: false
      });
    }

    // 여러 페이지 지원
    let pages = [];
    if (printableDiary.pages && Array.isArray(printableDiary.pages)) {
      // 새 형식: 여러 페이지
      for (const page of printableDiary.pages) {
        if (page.filePath && fs.existsSync(path.join(__dirname, page.filePath))) {
          const buffer = fs.readFileSync(path.join(__dirname, page.filePath));
          pages.push({
            imageData: buffer.toString('base64'),
            pageNumber: page.pageNumber,
          });
        }
      }
    } else if (printableDiary.filePath) {
      // 기존 형식: 단일 페이지
      if (fs.existsSync(path.join(__dirname, printableDiary.filePath))) {
        const buffer = fs.readFileSync(path.join(__dirname, printableDiary.filePath));
        pages.push({
          imageData: buffer.toString('base64'),
          pageNumber: 1,
        });
      }
    }

    res.json({
      success: true,
      hasPrintable: true,
      data: {
        _id: printableDiary._id.toString(),
        diaryId: printableDiary.diaryId.toString(),
        userId: printableDiary.userId,
        pages: pages,
        pageCount: pages.length,
        mimeType: printableDiary.mimeType,
        createdAt: printableDiary.createdAt,
      }
    });
  } catch (err) {
    console.error("❌ 인쇄 다이어리 조회 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/diaries/:diaryId/detail", async (req, res) => {
  console.log("📥 다이어리 상세 조회 (detail):", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");
    
    let diary;
    
    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      diary = await diariesCollection.findOne({ _id: objectIdDiaryId });
    } catch (e) {
      console.log("⚠️ ObjectId 변환 실패, 문자열로 찾기");
    }
    
    if (!diary) {
      diary = await diariesCollection.findOne({ _id: diaryId });
    }

    if (!diary) {
      return res.status(404).json({ success: false, error: "다이어리를 찾을 수 없습니다." });
    }

    if (diary.photoSlots && diary.photoSlots.length > 0) {
      const photoIds = diary.photoSlots.map(slot => {
        try {
          return new ObjectId(slot.id);
        } catch (e) {
          return slot.id;
        }
      }).filter(id => id);

      if (photoIds.length > 0) {
        const images = await imagesCollection.find({ _id: { $in: photoIds } }).toArray();

        diary.photoSlots = diary.photoSlots.map(slot => {
          const image = images.find(img => img._id.toString() === slot.id.toString());
          return {
            ...slot,
            imageData: image?.imageData,
            mimeType: image?.mimeType,
          };
        });
      }
    }

    res.json({ success: true, data: diary });
  } catch (err) {
    console.error("❌ 다이어리 상세 조회 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 3. DELETE 라우트
app.delete("/api/diaries/:diaryId", async (req, res) => {
  console.log("📥 다이어리 삭제 요청:", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");
    
    let diary;
    
    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      diary = await diariesCollection.findOne({ _id: objectIdDiaryId });
      if (diary) {
        console.log("✅ ObjectId로 찾음: 성공");
      } else {
        console.log("⚠️ ObjectId로 못 찾음, 문자열로 시도");
      }
    } catch (e) {
      console.log("⚠️ ObjectId 변환 실패:", e.message);
    }
    
    if (!diary) {
      diary = await diariesCollection.findOne({ _id: diaryId });
      if (diary) {
        console.log("✅ 문자열로 찾음: 성공");
      }
    }

    if (!diary) {
      console.log("❌ 다이어리를 찾을 수 없음. diaryId:", diaryId);
      return res.status(404).json({ error: "다이어리를 찾을 수 없습니다." });
    }

    console.log("📝 조회된 다이어리:", diary._id);

    const imageIds = [];
    if (diary.photoSlots && Array.isArray(diary.photoSlots)) {
      diary.photoSlots.forEach((slot) => {
        if (slot.id && !slot.id.startsWith("temp")) {
          imageIds.push(slot.id);
        }
      });
    }

    let deletedImageCount = 0;
    if (imageIds.length > 0) {
      const imageDeleteResult = await imagesCollection.deleteMany({ _id: { $in: imageIds } });
      deletedImageCount = imageDeleteResult.deletedCount;
      console.log(`✅ ${deletedImageCount}개의 이미지 삭제됨`);
    }

    await diariesCollection.deleteOne({ _id: diary._id });
    console.log("✅ 다이어리 삭제 완료");

    const aiDiaryCollection = client.db("diary").collection("AI diary results");
    
    let aiDeleteResult;
    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      aiDeleteResult = await aiDiaryCollection.deleteMany({ diaryId: objectIdDiaryId });
    } catch (e) {
      aiDeleteResult = await aiDiaryCollection.deleteMany({ diaryId: diaryId });
    }
    
    console.log(`✅ ${aiDeleteResult.deletedCount}개의 AI 다이어리 결과 삭제됨`);

    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      const printDeleteResult = await printableDiaryCollection.deleteMany({ diaryId: objectIdDiaryId });
      console.log(`✅ ${printDeleteResult.deletedCount}개의 인쇄 다이어리 삭제됨`);
    } catch (e) {
      console.log("⚠️ 인쇄 다이어리 삭제 시도 (문자열)");
      const printDeleteResult = await printableDiaryCollection.deleteMany({ diaryId: diaryId });
      console.log(`✅ ${printDeleteResult.deletedCount}개의 인쇄 다이어리 삭제됨`);
    }

    res.json({ 
      success: true, 
      message: "✅ 다이어리 삭제 완료",
      deletedImages: deletedImageCount,
      deletedAIDiaries: aiDeleteResult.deletedCount
    });
  } catch (err) {
    console.error("❌ 다이어리 삭제 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 4. 통합 다이어리 조회 (맨 마지막!)
app.get("/api/diaries/:diaryId", async (req, res) => {
  console.log("📥 다이어리 상세 조회 (통합 API):", req.params.diaryId);
  const { diaryId } = req.params;

  try {
    const { ObjectId } = require("mongodb");

    let diary;

    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      diary = await diariesCollection.findOne({ _id: objectIdDiaryId });
      console.log("🔍 ObjectId로 조회:", diary ? "성공" : "실패");
    } catch (e) {
      console.log("⚠️ ObjectId 변환 실패, 문자열로 찾기");
    }

    if (!diary) {
      diary = await diariesCollection.findOne({ _id: diaryId });
      console.log("🔍 문자열로 조회:", diary ? "성공" : "실패");
    }

    if (!diary) {
      return res.status(404).json({ success: false, error: "다이어리를 찾을 수 없습니다." });
    }

    console.log("📝 조회된 다이어리:", {
      _id: diary._id,
      title: diary.title,
      isCompleted: diary.isCompleted
    });

    const aiDiaryCollection = client.db("diary").collection("AI diary results");
    let aiDiary = null;

    try {
      const objectIdDiaryId = new ObjectId(diaryId);
      aiDiary = await aiDiaryCollection.findOne({ diaryId: objectIdDiaryId });
    } catch (e) {
      aiDiary = await aiDiaryCollection.findOne({ diaryId: diaryId });
    }

    console.log("🤖 AI 내용:", aiDiary?.content ? "있음" : "없음");

    if (diary.photoSlots && diary.photoSlots.length > 0) {
      const photoIds = diary.photoSlots
        .map(slot => {
          try {
            return new ObjectId(slot.id);
          } catch (e) {
            return slot.id;
          }
        })
        .filter(id => id);

      if (photoIds.length > 0) {
        const images = await imagesCollection.find({
          _id: { $in: photoIds }
        }).toArray();

        diary.photoSlots = diary.photoSlots.map(slot => {
          const image = images.find(img => img._id.toString() === slot.id.toString());
          return {
            ...slot,
            imageData: image?.imageData,
            mimeType: image?.mimeType,
          };
        });
      }
    }

    const responseData = {
      ...diary,
      aiContent: aiDiary?.content || null,
      isCompleted: diary.isCompleted === true
    };

    console.log("✅ 최종 응답:", {
      hasAiContent: !!responseData.aiContent,
      isCompleted: responseData.isCompleted
    });

    res.json({
      success: true,
      data: responseData
    });
  } catch (err) {
    console.error("❌ 다이어리 상세 조회 오류:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 인쇄 관련 API
// ==========================================

// 다이어리 인쇄 요청
app.post("/api/print/diary", printController.printDiary);

// 인쇄 작업 상태 조회
app.get("/api/print/status/:jobId", printController.getPrintStatus);

// 프린터 상태 확인
app.get("/api/print/printer-status", printController.getPrinterStatus);

// 라즈베리파이에서 인쇄 완료 알림 웹훅
app.post("/api/print/complete", printController.handlePrintComplete);