# Raspberry Pi Print Server

라즈베리파이에서 실행되는 포토프린터 제어 서버입니다.

## 설치 방법

### 1. 라즈베리파이에 파일 복사
이 폴더를 라즈베리파이에 복사합니다.

```bash
# 라즈베리파이로 파일 복사 (로컬 PC에서 실행)
scp -r raspberry-pi pi@raspberrypi.local:/home/pi/
```

### 2. 라즈베리파이에서 설정

```bash
# 라즈베리파이에 SSH 접속
ssh pi@raspberrypi.local

# 프로젝트 디렉토리로 이동
cd /home/pi/raspberry-pi

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
nano .env  # 필요한 설정 수정
```

### 3. 프린터 설정 (CUPS)

```bash
# CUPS 설치 (아직 설치되지 않은 경우)
sudo apt-get update
sudo apt-get install cups

# CUPS 웹 인터페이스에서 프린터 추가
# 브라우저에서 http://raspberrypi.local:631 접속
# Administration > Add Printer 에서 포토프린터 추가

# 프린터 이름 확인
lpstat -p

# .env 파일에서 PRINTER_NAME을 실제 프린터 이름으로 수정
```

### 4. 서버 실행

```bash
# 개발 모드 (자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

### 5. 자동 시작 설정 (옵션)

시스템 부팅 시 자동으로 서버가 시작되도록 설정:

```bash
# PM2 설치
sudo npm install -g pm2

# 서버 시작
pm2 start print-server.js --name print-server

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

## API 엔드포인트

### 1. 프린터 상태 확인
```
GET /api/printer/status
```

### 2. 인쇄 요청
```
POST /api/print
Content-Type: application/json

{
  "jobId": "print_123456",
  "diaryId": "diary_id",
  "title": "My Diary",
  "date": "2025-11-18",
  "pages": [
    {
      "pageNumber": 1,
      "imageData": "base64_encoded_image"
    }
  ],
  "mimeType": "image/jpeg"
}
```

### 3. 인쇄 큐 조회 (디버깅용)
```
GET /api/queue
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| PORT | 서버 포트 | 3002 |
| BACKEND_URL | 백엔드 서버 URL | http://localhost:3001 |
| PRINTER_NAME | CUPS에 등록된 프린터 이름 | Photo_Printer |
| PRINT_QUALITY | 인쇄 품질 (low/medium/high) | high |
| PAPER_SIZE | 용지 크기 | 4x6 |

## 로그 확인

```bash
# 실시간 로그 확인
pm2 logs print-server

# 오류 로그만 확인
pm2 logs print-server --err
```

## 문제 해결

### 프린터를 찾을 수 없는 경우
```bash
# 프린터 목록 확인
lpstat -p

# 프린터 드라이버 확인
lpstat -d

# CUPS 재시작
sudo systemctl restart cups
```

### 권한 문제
```bash
# 사용자를 lpadmin 그룹에 추가
sudo usermod -a -G lpadmin pi

# 로그아웃 후 다시 로그인
```

## 아키텍처

```
Browser (Frontend)
    ↓ HTTP Request
Backend Server (Node.js - port 3001)
    ↓ HTTP POST
Raspberry Pi (Print Server - port 3002)
    ↓ CUPS
Photo Printer (USB/Network)
```
