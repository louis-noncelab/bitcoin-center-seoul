#!/bin/bash

# EC2에서 Git 저장소 초기 설정 스크립트
# 사용법: ./setup-ec2-git.sh [EC2_PUBLIC_IP] [GITHUB_REPO_URL]

set -e

EC2_IP=${1:-"YOUR_EC2_PUBLIC_IP"}
GITHUB_REPO=${2:-"https://github.com/YOUR_USERNAME/bitcoin-center-seoul.git"}
KEY_PATH="~/.ssh/bitcoin-center-seoul-key"
APP_DIR="/var/www/bitcoin-center-seoul"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 EC2 Git 저장소 초기 설정 시작...${NC}"

# EC2에서 Git 저장소 클론 및 설정
ssh -i $KEY_PATH ubuntu@$EC2_IP << EOF
    set -e
    
    # 애플리케이션 디렉토리 생성
    sudo mkdir -p $APP_DIR
    sudo chown ubuntu:ubuntu $APP_DIR
    cd $APP_DIR
    
    # Git 저장소 클론
    echo "📥 Git 저장소 클론 중..."
    git clone $GITHUB_REPO .
    
    # 의존성 설치
    echo "📦 의존성 설치 중..."
    npm install
    
    # 프로덕션 빌드
    echo "🔨 프로덕션 빌드 중..."
    npm run build
    
    # PM2 설정 파일이 있는지 확인
    if [ ! -f "ecosystem.config.js" ]; then
        echo "⚠️  ecosystem.config.js 파일이 없습니다. PM2 설정을 수동으로 해주세요."
    fi
    
    # PM2로 서비스 시작
    echo "🚀 PM2 서비스 시작 중..."
    pm2 start ecosystem.config.js || pm2 start server.js --name "bitcoin-center-seoul"
    pm2 save
    pm2 startup
    
    echo "✅ EC2 Git 설정 완료!"
    echo "📊 PM2 상태:"
    pm2 status
EOF

echo -e "${GREEN}🎉 EC2 Git 저장소 초기 설정이 완료되었습니다!${NC}"
echo -e "${YELLOW}📋 다음 단계:${NC}"
echo -e "   1. GitHub Actions Secrets 설정 (선택사항)"
echo -e "   2. ./deploy.sh $EC2_IP $GITHUB_REPO 로 배포 테스트"
