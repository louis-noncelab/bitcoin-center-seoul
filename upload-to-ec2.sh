#!/bin/bash

# 로컬에서 EC2로 파일 전송 및 배포 스크립트
# 사용법: ./upload-to-ec2.sh

set -e

# 설정 (실제 값으로 변경해주세요)
EC2_IP="YOUR_EC2_PUBLIC_IP"  # 예: "3.34.123.45"
KEY_PATH="~/.ssh/bitcoin-center-seoul-key"
APP_DIR="/var/www/bitcoin-center-seoul"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Bitcoin Center Seoul 파일 전송 및 배포 시작...${NC}"

# 1. 설정 확인
echo -e "${YELLOW}🔍 설정 확인 중...${NC}"
if [ "$EC2_IP" = "YOUR_EC2_PUBLIC_IP" ]; then
    echo -e "${RED}❌ EC2_IP를 실제 IP 주소로 변경해주세요.${NC}"
    echo -e "${YELLOW}   예: EC2_IP=\"3.34.123.45\"${NC}"
    exit 1
fi

# 2. EC2 연결 테스트
echo -e "${YELLOW}🔍 EC2 연결 테스트 중...${NC}"
if ! ssh -i $KEY_PATH -o ConnectTimeout=10 ubuntu@$EC2_IP "echo 'EC2 연결 성공'" > /dev/null 2>&1; then
    echo -e "${RED}❌ EC2 연결 실패. IP 주소와 SSH 키를 확인해주세요.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ EC2 연결 성공${NC}"

# 3. 로컬에서 빌드
echo -e "${YELLOW}📦 로컬에서 빌드 중...${NC}"
npm run build

# 4. 파일을 EC2로 전송
echo -e "${YELLOW}📤 파일 전송 중...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  -e "ssh -i $KEY_PATH" \
  ./ ubuntu@$EC2_IP:$APP_DIR/

# 5. EC2에서 배포 실행
echo -e "${YELLOW}🚀 EC2에서 배포 실행 중...${NC}"
ssh -i $KEY_PATH ubuntu@$EC2_IP << EOF
    cd $APP_DIR
    chmod +x deploy.sh
    ./deploy.sh
EOF

echo -e "${GREEN}🎉 파일 전송 및 배포가 완료되었습니다!${NC}"
echo -e "${BLUE}📱 접속 URL:${NC}"
echo -e "   • HTTPS: https://bitcoincenterseoul.com"
echo -e "   • WWW:   https://www.bitcoincenterseoul.com"
