const fs = require("fs");
const ExifParser = require("exif-parser");


function extractExifInfo(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    // GPS 좌표
    const lat = result.tags.GPSLatitude;
    const lon = result.tags.GPSLongitude;
    const latRef = result.tags.GPSLatitudeRef;
    const lonRef = result.tags.GPSLongitudeRef;

    // 위도/경도 방향 보정 (N/S, E/W)
    let latitude = lat ? (latRef === "S" ? -lat : lat) : null;
    let longitude = lon ? (lonRef === "W" ? -lon : lon) : null;

    // 촬영 날짜
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
    console.error("❌ EXIF 추출 오류:", error);
    return { success: false, msg: "메타데이터 추출 실패" };
  }
}

console.log(extractExifInfo("C:\\Users\\kimda\\Desktop\\dasol\\소중대\\OSSAI\\test\\test2.jpg"));
