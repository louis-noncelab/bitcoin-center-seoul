#!/bin/bash

# Bitcoin Center Seoul 로컬 배포 스크립트
# EC2에 SSH 접속 후 실행하는 스크립트
# 사용법: ./deploy.sh

set -e

# 설정
GITHUB_REPO="https://github.com/louis-noncelab/bitcoin-center-seoul.git"
APP_DIR="/bitcoin-center-seoul"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Bitcoin Center Seoul 배포 시작...${NC}"

# 1. 현재 디렉토리 확인
echo -e "${YELLOW}🔍 현재 위치 확인 중...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ 애플리케이션 디렉토리를 찾을 수 없습니다: $APP_DIR${NC}"
    echo -e "${YELLOW}   올바른 디렉토리에서 실행해주세요.${NC}"
    exit 1
fi

cd $APP_DIR
echo -e "${GREEN}✅ 애플리케이션 디렉토리로 이동: $(pwd)${NC}"

# 2. Git 상태 확인
echo -e "${YELLOW}📋 Git 상태 확인 중...${NC}"
echo "현재 브랜치: $(git branch --show-current)"
echo "최신 커밋: $(git log -1 --oneline)"

# 3. 로컬 변경사항 처리
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  로컬 변경사항이 있습니다.${NC}"
    echo "로컬 변경사항을 stash합니다..."
    git stash push -m "Deploy stash $(date)"
fi

# 4. GitHub에서 최신 코드 pull
echo -e "${YELLOW}📥 GitHub에서 최신 코드 pull 중...${NC}"
git fetch origin
git reset --hard origin/main

# 최신 커밋 정보 출력
echo -e "${GREEN}✅ 업데이트된 커밋: $(git log -1 --oneline)${NC}"

# 5. 의존성 설치
echo -e "${YELLOW}📦 의존성 설치 중...${NC}"
npm install

# 6. 프로덕션 빌드
echo -e "${YELLOW}🔨 프로덕션 빌드 중...${NC}"
npm run build

# 빌드 결과 확인
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ 빌드 실패: dist 디렉토리가 생성되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 빌드 완료: $(du -sh dist | cut -f1) 크기의 dist 디렉토리 생성${NC}"

# 7. PM2로 서비스 재시작
echo -e "${YELLOW}🔄 서비스 재시작 중...${NC}"
pm2 restart bitcoin-center-seoul || pm2 start ecosystem.config.js

# PM2 상태 확인
echo -e "${GREEN}📊 PM2 서비스 상태:${NC}"
pm2 status

# PM2 설정 저장
pm2 save

# 8. 서비스 상태 확인
echo -e "${YELLOW}🔍 서비스 상태 확인 중...${NC}"

# Nginx 상태 확인
echo -e "${BLUE}📋 Nginx 상태:${NC}"
sudo systemctl status nginx --no-pager -l

# 포트 3000 확인
echo -e "${BLUE}📋 포트 3000 상태:${NC}"
netstat -tlnp | grep :3000 || echo "포트 3000이 열려있지 않습니다."

# 최근 로그 확인
echo -e "${BLUE}📋 최근 PM2 로그:${NC}"
pm2 logs bitcoin-center-seoul --lines 10 --nostream

# 9. 웹사이트 접속 테스트
echo -e "${YELLOW}🌐 웹사이트 접속 테스트 중...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "${GREEN}✅ 로컬 서버 접속 성공${NC}"
else
    echo -e "${RED}❌ 로컬 서버 접속 실패${NC}"
fi

# 10. 배포 완료 메시지
echo -e "${GREEN}🎉 배포가 성공적으로 완료되었습니다!${NC}"
echo -e "${BLUE}📱 접속 URL:${NC}"
echo -e "   • HTTPS: https://bitcoincenterseoul.com"
echo -e "   • WWW:   https://www.bitcoincenterseoul.com"
echo ""
echo -e "${YELLOW}📊 유용한 명령어:${NC}"
echo -e "   • 로그 확인: pm2 logs bitcoin-center-seoul"
echo -e "   • 서비스 상태: pm2 status"
echo -e "   • Nginx 재시작: sudo systemctl restart nginx"
echo -e "   • 실시간 로그: pm2 logs bitcoin-center-seoul --follow"
