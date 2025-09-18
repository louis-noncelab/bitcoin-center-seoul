import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅을 위한 fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
  console.log(`http://localhost:${port}에서 확인하세요`);
});
