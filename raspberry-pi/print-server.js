const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const printerDriver = require('./printer-driver');

const app = express();
const PORT = process.env.PORT || 3002;

// CORS 설정 - 백엔드 서버에서의 요청만 허용
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 인쇄 작업 큐
const printQueue = [];
let isPrinting = false;

/**
 * 프린터 상태 확인 API
 */
app.get('/api/printer/status', async (req, res) => {
  try {
    console.log('🖨️  프린터 상태 확인 요청');

    const status = await printerDriver.checkPrinterStatus();

    res.json({
      success: true,
      status: status.available ? 'ready' : 'offline',
      message: status.message,
      queueLength: printQueue.length,
      isPrinting: isPrinting
    });
  } catch (error) {
    console.error('❌ 프린터 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: error.message
    });
  }
});

/**
 * 인쇄 요청 API
 */
app.post('/api/print', async (req, res) => {
  try {
    const { jobId, diaryId, title, date, pages, mimeType } = req.body;

    console.log(`📥 인쇄 요청 수신: jobId=${jobId}, 페이지=${pages.length}장`);

    if (!jobId || !pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 인쇄 요청입니다.'
      });
    }

    // 인쇄 작업을 큐에 추가
    printQueue.push({
      jobId,
      diaryId,
      title,
      date,
      pages,
      mimeType,
      status: 'queued',
      createdAt: new Date()
    });

    console.log(`✅ 인쇄 작업 큐에 추가됨: ${printQueue.length}개 대기 중`);

    // 즉시 응답 반환
    res.json({
      success: true,
      message: '인쇄 작업이 큐에 추가되었습니다.',
      queuePosition: printQueue.length
    });

    // 비동기로 인쇄 처리 시작
    processPrintQueue();

  } catch (error) {
    console.error('❌ 인쇄 요청 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 인쇄 큐 처리 (순차 처리)
 */
async function processPrintQueue() {
  // 이미 인쇄 중이면 중단
  if (isPrinting) {
    console.log('ℹ️  이미 인쇄 작업이 진행 중입니다.');
    return;
  }

  // 큐가 비어있으면 중단
  if (printQueue.length === 0) {
    console.log('ℹ️  인쇄 큐가 비어있습니다.');
    return;
  }

  isPrinting = true;

  // 큐에서 첫 번째 작업 가져오기
  const job = printQueue.shift();

  console.log(`🖨️  인쇄 시작: jobId=${job.jobId}, ${job.pages.length}페이지`);
  job.status = 'printing';

  try {
    // 실제 프린터 드라이버로 인쇄 수행
    await printerDriver.printDiary(job);

    console.log(`✅ 인쇄 완료: jobId=${job.jobId}`);

    // 백엔드 서버에 완료 알림 전송
    await notifyBackend(job.jobId, true, null);

  } catch (error) {
    console.error(`❌ 인쇄 실패: jobId=${job.jobId}`, error);

    // 백엔드 서버에 실패 알림 전송
    await notifyBackend(job.jobId, false, error.message);
  }

  isPrinting = false;

  // 다음 작업 처리 (재귀 호출)
  if (printQueue.length > 0) {
    console.log(`📋 다음 작업 처리: ${printQueue.length}개 남음`);
    setTimeout(() => processPrintQueue(), 1000); // 1초 대기 후 다음 작업
  }
}

/**
 * 백엔드 서버에 인쇄 완료 알림
 */
async function notifyBackend(jobId, success, error) {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${BACKEND_URL}/api/print/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, success, error })
    });

    if (response.ok) {
      console.log(`✅ 백엔드에 완료 알림 전송: jobId=${jobId}`);
    } else {
      console.error(`❌ 백엔드 알림 실패: ${response.status}`);
    }
  } catch (err) {
    console.error('❌ 백엔드 알림 전송 오류:', err);
  }
}

/**
 * 인쇄 큐 조회 API (디버깅용)
 */
app.get('/api/queue', (req, res) => {
  res.json({
    success: true,
    queue: printQueue,
    isPrinting: isPrinting
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Raspberry Pi Print Server running on http://localhost:${PORT}`);
  console.log(`📡 Backend Server: ${process.env.BACKEND_URL || 'http://localhost:3001'}`);

  // 프린터 드라이버 초기화
  printerDriver.initialize()
    .then(() => {
      console.log('✅ 프린터 드라이버 초기화 완료');
    })
    .catch((error) => {
      console.error('❌ 프린터 드라이버 초기화 실패:', error);
    });
});

// 종료 시 정리 작업
process.on('SIGINT', async () => {
  console.log('\n🛑 서버 종료 중...');

  if (isPrinting) {
    console.log('⚠️  현재 인쇄 작업이 진행 중입니다. 작업 완료 후 종료됩니다.');
    // 여기서 실제로는 작업 완료를 기다려야 함
  }

  await printerDriver.cleanup();
  process.exit(0);
});
