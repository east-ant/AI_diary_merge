const { MongoClient, ObjectId } = require('mongodb');

// 라즈베리파이 프린트 서버 URL (환경변수로 설정 가능)
const RASPBERRY_PI_URL = process.env.RASPBERRY_PI_URL || 'http://localhost:3002';

// MongoDB 컬렉션 참조 (server.js에서 설정된 후 사용)
let diariesCollection;
let printableDiaryCollection;

// 컬렉션 초기화 함수 (server.js에서 호출)
function initializeCollections(diaries, printable) {
  diariesCollection = diaries;
  printableDiaryCollection = printable;
}

// 인쇄 작업 큐 (메모리 기반, 실제 운영 시 Redis 등 사용 권장)
const printJobs = new Map();

/**
 * 다이어리 인쇄 요청
 */
async function printDiary(req, res) {
  try {
    const { diaryId, userId, pageNumbers } = req.body;

    // 필수 파라미터 검증
    if (!diaryId || !userId) {
      return res.status(400).json({
        success: false,
        error: '다이어리 ID와 사용자 ID가 필요합니다.'
      });
    }

    console.log(`📄 인쇄 요청: diaryId=${diaryId}, userId=${userId}`);

    // 다이어리 조회
    const objectIdDiaryId = new ObjectId(diaryId);
    const diary = await diariesCollection.findOne({ _id: objectIdDiaryId });
    if (!diary || diary.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: '다이어리를 찾을 수 없습니다.'
      });
    }

    // 인쇄 가능한 이미지 데이터 조회
    const printableDiary = await printableDiaryCollection.findOne({ diaryId: objectIdDiaryId });
    if (!printableDiary || !printableDiary.pages || printableDiary.pages.length === 0) {
      return res.status(404).json({
        success: false,
        error: '인쇄 가능한 다이어리 이미지가 없습니다. 먼저 다이어리를 완성해주세요.'
      });
    }

    // 특정 페이지만 인쇄할 경우 필터링
    let pagesToPrint = printableDiary.pages;
    if (pageNumbers && Array.isArray(pageNumbers) && pageNumbers.length > 0) {
      pagesToPrint = printableDiary.pages.filter(page =>
        pageNumbers.includes(page.pageNumber)
      );
    }

    if (pagesToPrint.length === 0) {
      return res.status(400).json({
        success: false,
        error: '인쇄할 페이지가 없습니다.'
      });
    }

    // 인쇄 작업 ID 생성
    const jobId = `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 인쇄 작업 정보 저장
    printJobs.set(jobId, {
      jobId,
      diaryId,
      userId,
      status: 'pending',
      totalPages: pagesToPrint.length,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 라즈베리파이로 인쇄 요청 전송 (비동기)
    sendToPrinter(jobId, {
      diaryId,
      title: diary.title,
      date: diary.date,
      pages: pagesToPrint,
      mimeType: printableDiary.mimeType
    });

    // 즉시 응답 반환 (비동기 처리)
    res.json({
      success: true,
      message: '인쇄 요청이 접수되었습니다.',
      jobId,
      status: 'pending',
      totalPages: pagesToPrint.length
    });

  } catch (error) {
    console.error('❌ 인쇄 요청 오류:', error);
    res.status(500).json({
      success: false,
      error: '인쇄 요청 처리 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 라즈베리파이로 인쇄 데이터 전송 (비동기)
 */
async function sendToPrinter(jobId, printData) {
  try {
    console.log(`📤 라즈베리파이로 인쇄 데이터 전송: jobId=${jobId}`);

    // 인쇄 작업 상태 업데이트
    const job = printJobs.get(jobId);
    if (job) {
      job.status = 'sending';
      job.updatedAt = new Date();
    }

    // 라즈베리파이로 HTTP POST 요청
    // Node.js 18 이상에서는 fetch가 기본 내장
    const response = await fetch(`${RASPBERRY_PI_URL}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        ...printData
      }),
      signal: AbortSignal.timeout(30000) // 30초 타임아웃
    });

    const result = await response.json();

    // 결과에 따라 작업 상태 업데이트
    if (result.success) {
      if (job) {
        job.status = 'printing';
        job.updatedAt = new Date();
      }
      console.log(`✅ 인쇄 시작: jobId=${jobId}`);
    } else {
      if (job) {
        job.status = 'failed';
        job.error = result.error || '인쇄 실패';
        job.updatedAt = new Date();
      }
      console.error(`❌ 인쇄 실패: jobId=${jobId}, error=${result.error}`);
    }

  } catch (error) {
    console.error(`❌ 라즈베리파이 통신 오류: jobId=${jobId}`, error);

    const job = printJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message || '라즈베리파이와 통신할 수 없습니다.';
      job.updatedAt = new Date();
    }
  }
}

/**
 * 인쇄 작업 상태 조회
 */
async function getPrintStatus(req, res) {
  try {
    const { jobId } = req.params;

    const job = printJobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: '인쇄 작업을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('❌ 인쇄 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '상태 조회 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 라즈베리파이 프린터 상태 확인
 */
async function getPrinterStatus(req, res) {
  try {
    console.log('🖨️  프린터 상태 확인 중...');

    // 라즈베리파이 서버에 상태 확인 요청
    const response = await fetch(`${RASPBERRY_PI_URL}/api/printer/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5초 타임아웃
    });

    const result = await response.json();

    res.json({
      success: true,
      data: {
        online: result.success,
        status: result.status || 'unknown',
        message: result.message
      }
    });

  } catch (error) {
    console.error('❌ 프린터 상태 확인 오류:', error);
    res.json({
      success: false,
      data: {
        online: false,
        status: 'offline',
        message: '라즈베리파이와 연결할 수 없습니다.'
      }
    });
  }
}

/**
 * 라즈베리파이에서 인쇄 완료 알림을 받는 웹훅
 */
async function handlePrintComplete(req, res) {
  try {
    const { jobId, success, error } = req.body;

    const job = printJobs.get(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: '인쇄 작업을 찾을 수 없습니다.'
      });
    }

    // 작업 상태 업데이트
    job.status = success ? 'completed' : 'failed';
    job.error = error;
    job.completedAt = new Date();
    job.updatedAt = new Date();

    console.log(`${success ? '✅' : '❌'} 인쇄 완료: jobId=${jobId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('❌ 인쇄 완료 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: '처리 중 오류가 발생했습니다.'
    });
  }
}

module.exports = {
  initializeCollections,
  printDiary,
  getPrintStatus,
  getPrinterStatus,
  handlePrintComplete
};
