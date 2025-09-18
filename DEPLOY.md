# 🚀 Bitcoin Center Seoul 배포 가이드

## 📋 사전 준비

### 1. deploy.sh 설정
`deploy.sh` 파일에서 다음 값들을 실제 값으로 변경해주세요:

```bash
# 설정 (실제 값으로 변경해주세요)
EC2_IP="3.34.123.45"  # 실제 EC2 퍼블릭 IP
GITHUB_REPO="https://github.com/yourusername/bitcoin-center-seoul.git"  # 실제 GitHub 저장소 URL
KEY_PATH="~/.ssh/bitcoin-center-seoul-key"  # SSH 키 경로
```

### 2. SSH 키 확인
```bash
# SSH 키가 있는지 확인
ls -la ~/.ssh/bitcoin-center-seoul-key

# 없다면 생성
ssh-keygen -t rsa -b 4096 -f ~/.ssh/bitcoin-center-seoul-key
```

## 🎯 사용법

### 소스코드 업데이트 후 배포
```bash
# 1. 소스코드 수정 후 GitHub에 push
git add .
git commit -m "업데이트 내용"
git push origin main

# 2. 배포 실행
./deploy.sh
```

### 배포 과정
1. ✅ **설정 확인** - EC2 IP와 GitHub URL 검증
2. ✅ **EC2 연결 테스트** - SSH 연결 확인
3. ✅ **GitHub에서 최신 코드 pull** - main 브랜치에서 최신 코드 가져오기
4. ✅ **의존성 설치** - npm install
5. ✅ **프로덕션 빌드** - npm run build
6. ✅ **서비스 재시작** - PM2로 애플리케이션 재시작
7. ✅ **상태 확인** - 서비스 및 웹사이트 접속 테스트

## 🔧 문제 해결

### EC2 연결 실패
```bash
# SSH 키 권한 확인
chmod 600 ~/.ssh/bitcoin-center-seoul-key

# EC2 보안 그룹에서 포트 22 열려있는지 확인
```

### 빌드 실패
```bash
# EC2에서 직접 확인
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP
cd /var/www/bitcoin-center-seoul
npm run build
```

### 서비스 재시작 실패
```bash
# PM2 상태 확인
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP 'pm2 status'

# PM2 로그 확인
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP 'pm2 logs bitcoin-center-seoul'
```

## 📊 유용한 명령어

```bash
# 서비스 상태 확인
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP 'pm2 status'

# 로그 실시간 확인
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP 'pm2 logs bitcoin-center-seoul --follow'

# Nginx 재시작
ssh -i ~/.ssh/bitcoin-center-seoul-key ubuntu@YOUR_EC2_IP 'sudo systemctl restart nginx'

# 웹사이트 접속 테스트
curl -I https://bitcoincenterseoul.com
```

## 🌐 접속 URL

- **HTTPS**: https://bitcoincenterseoul.com
- **WWW**: https://www.bitcoincenterseoul.com
- **HTTP**: http://YOUR_EC2_IP (자동으로 HTTPS로 리다이렉트)
