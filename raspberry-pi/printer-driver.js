const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 프린터 드라이버 모듈
 * 실제 라즈베리파이에서 포토프린터를 제어하는 로직
 */

// 프린터 설정
const PRINTER_CONFIG = {
  // 실제 프린터 이름 (CUPS에 등록된 이름)
  printerName: process.env.PRINTER_NAME || 'Photo_Printer',

  // 인쇄 품질 설정
  quality: process.env.PRINT_QUALITY || 'high',

  // 용지 크기 (4x6 inch 포토 용지)
  paperSize: process.env.PAPER_SIZE || '4x6',

  // 임시 파일 저장 경로
  tempDir: path.join(__dirname, 'temp'),
};

/**
 * 프린터 드라이버 초기화
 */
async function initialize() {
  console.log('🔧 프린터 드라이버 초기화 중...');

  // 임시 디렉토리 생성
  if (!fs.existsSync(PRINTER_CONFIG.tempDir)) {
    fs.mkdirSync(PRINTER_CONFIG.tempDir, { recursive: true });
    console.log(`📁 임시 디렉토리 생성: ${PRINTER_CONFIG.tempDir}`);
  }

  // 프린터 연결 확인
  try {
    const status = await checkPrinterStatus();
    if (status.available) {
      console.log('✅ 프린터 연결 확인됨:', PRINTER_CONFIG.printerName);
    } else {
      console.warn('⚠️  프린터를 찾을 수 없습니다:', status.message);
    }
  } catch (error) {
    console.error('❌ 프린터 초기화 오류:', error);
  }
}

/**
 * 프린터 상태 확인
 */
async function checkPrinterStatus() {
  try {
    // CUPS를 사용하여 프린터 상태 확인 (리눅스 기반)
    // Windows에서는 다른 방법 필요
    if (process.platform === 'linux') {
      try {
        const { stdout } = await execAsync(`lpstat -p ${PRINTER_CONFIG.printerName}`);

        if (stdout.includes('enabled') || stdout.includes('idle')) {
          return {
            available: true,
            message: 'Printer is ready',
            details: stdout.trim()
          };
        } else {
          return {
            available: false,
            message: 'Printer is not ready',
            details: stdout.trim()
          };
        }
      } catch (error) {
        return {
          available: false,
          message: 'Printer not found or not configured',
          details: error.message
        };
      }
    } else {
      // Windows 또는 개발 환경에서는 항상 사용 가능으로 표시 (테스트용)
      console.log('ℹ️  개발 환경 - 프린터 상태 확인 생략');
      return {
        available: true,
        message: 'Development mode - printer status check skipped',
        details: 'Running on non-Linux platform'
      };
    }
  } catch (error) {
    console.error('❌ 프린터 상태 확인 오류:', error);
    return {
      available: false,
      message: error.message,
      details: error.stack
    };
  }
}

/**
 * 다이어리 인쇄 실행
 */
async function printDiary(job) {
  console.log(`🖨️  다이어리 인쇄 시작: ${job.title} (${job.pages.length}페이지)`);

  const printedFiles = [];

  try {
    // 각 페이지를 순차적으로 인쇄
    for (let i = 0; i < job.pages.length; i++) {
      const page = job.pages[i];

      console.log(`📄 페이지 ${page.pageNumber}/${job.pages.length} 인쇄 중...`);

      // Base64 이미지 데이터를 파일로 저장
      const imageBuffer = Buffer.from(page.imageData, 'base64');
      const fileName = `print_${job.jobId}_page${page.pageNumber}.jpg`;
      const filePath = path.join(PRINTER_CONFIG.tempDir, fileName);

      fs.writeFileSync(filePath, imageBuffer);
      printedFiles.push(filePath);

      console.log(`💾 이미지 저장: ${filePath}`);

      // 실제 프린터로 인쇄
      await printImage(filePath);

      console.log(`✅ 페이지 ${page.pageNumber} 인쇄 완료`);

      // 페이지 간 대기 시간 (프린터 안정성)
      if (i < job.pages.length - 1) {
        await sleep(2000); // 2초 대기
      }
    }

    console.log(`✅ 전체 인쇄 완료: ${job.title}`);

    // 임시 파일 정리
    cleanupTempFiles(printedFiles);

    return { success: true };

  } catch (error) {
    console.error('❌ 인쇄 오류:', error);

    // 오류 발생 시에도 임시 파일 정리
    cleanupTempFiles(printedFiles);

    throw error;
  }
}

/**
 * 이미지 파일을 프린터로 전송
 */
async function printImage(filePath) {
  try {
    if (process.platform === 'linux') {
      // CUPS를 사용한 리눅스 인쇄 (라즈베리파이)
      const command = `lp -d ${PRINTER_CONFIG.printerName} -o media=${PRINTER_CONFIG.paperSize} -o quality=${PRINTER_CONFIG.quality} "${filePath}"`;

      console.log(`🖨️  인쇄 명령 실행: ${command}`);

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.warn('⚠️  인쇄 경고:', stderr);
      }

      console.log('✅ 인쇄 명령 전송 완료:', stdout.trim());

      // 인쇄 완료 대기 (실제 프린터 출력 시간)
      await sleep(5000); // 5초 대기

    } else {
      // Windows 또는 개발 환경에서는 시뮬레이션
      console.log('ℹ️  개발 환경 - 인쇄 시뮬레이션');
      console.log(`📄 인쇄할 파일: ${filePath}`);

      // 파일 존재 여부 확인
      if (!fs.existsSync(filePath)) {
        throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
      }

      // 인쇄 시뮬레이션 (2초 대기)
      await sleep(2000);

      console.log('✅ 인쇄 시뮬레이션 완료');
    }
  } catch (error) {
    console.error('❌ 이미지 인쇄 오류:', error);
    throw new Error(`인쇄 실패: ${error.message}`);
  }
}

/**
 * 임시 파일 정리
 */
function cleanupTempFiles(files) {
  console.log('🧹 임시 파일 정리 중...');

  files.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  삭제됨: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ 파일 삭제 오류: ${filePath}`, error);
    }
  });
}

/**
 * 종료 시 정리 작업
 */
async function cleanup() {
  console.log('🧹 프린터 드라이버 정리 중...');

  // 임시 디렉토리의 모든 파일 삭제
  try {
    if (fs.existsSync(PRINTER_CONFIG.tempDir)) {
      const files = fs.readdirSync(PRINTER_CONFIG.tempDir);
      files.forEach(file => {
        const filePath = path.join(PRINTER_CONFIG.tempDir, file);
        fs.unlinkSync(filePath);
      });
      console.log('✅ 임시 파일 정리 완료');
    }
  } catch (error) {
    console.error('❌ 정리 작업 오류:', error);
  }
}

/**
 * 유틸리티: 대기 함수
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  initialize,
  checkPrinterStatus,
  printDiary,
  cleanup
};
