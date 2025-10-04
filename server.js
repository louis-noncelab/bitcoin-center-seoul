import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// JSON 파싱 미들웨어
app.use(express.json());

// 데이터베이스 초기화
initDatabase();

// API 라우트
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
    res.json(events);
  } catch (error) {
    console.error('이벤트 조회 오류:', error);
    res.status(500).json({ error: '이벤트 조회에 실패했습니다.' });
  }
});

app.get('/api/events/upcoming', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const events = db.prepare(`
      SELECT * FROM events 
      WHERE date >= ? 
      ORDER BY date ASC
    `).all(today);
    res.json(events);
  } catch (error) {
    console.error('다가오는 이벤트 조회 오류:', error);
    res.status(500).json({ error: '다가오는 이벤트 조회에 실패했습니다.' });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const { title, titleEn, date, time, location, locationEn, description, descriptionEn } = req.body;
    
    const insertEvent = db.prepare(`
      INSERT INTO events (title, titleEn, date, time, location, locationEn, description, descriptionEn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertEvent.run(title, titleEn, date, time, location, locationEn, description, descriptionEn);
    
    res.json({ 
      id: result.lastInsertRowid,
      message: '이벤트가 성공적으로 생성되었습니다.' 
    });
  } catch (error) {
    console.error('이벤트 생성 오류:', error);
    res.status(500).json({ error: '이벤트 생성에 실패했습니다.' });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, titleEn, date, time, location, locationEn, description, descriptionEn } = req.body;
    
    const updateEvent = db.prepare(`
      UPDATE events 
      SET title = ?, titleEn = ?, date = ?, time = ?, location = ?, locationEn = ?, 
          description = ?, descriptionEn = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateEvent.run(title, titleEn, date, time, location, locationEn, description, descriptionEn, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '이벤트가 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    console.error('이벤트 업데이트 오류:', error);
    res.status(500).json({ error: '이벤트 업데이트에 실패했습니다.' });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteEvent = db.prepare('DELETE FROM events WHERE id = ?');
    const result = deleteEvent.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '이벤트가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('이벤트 삭제 오류:', error);
    res.status(500).json({ error: '이벤트 삭제에 실패했습니다.' });
  }
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅을 위한 fallback - 모든 경로에 대해 index.html 반환
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
  console.log(`http://localhost:${port}에서 확인하세요`);
});
