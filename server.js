import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db, initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const highlightOrder = "ORDER BY COALESCE(NULLIF(endDate, ''), NULLIF(startDate, ''), REPLACE(date, '.', '-')) DESC, id DESC";

// JSON 파싱 미들웨어
app.use(express.json());

// 데이터베이스 초기화
initDatabase();

// API 라우트
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY date DESC, time DESC').all();
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
    const { title, titleEn, date, time, location, locationEn, description, descriptionEn, image, link } = req.body;
    
    const insertEvent = db.prepare(`
      INSERT INTO events (title, titleEn, date, time, location, locationEn, description, descriptionEn, image, link)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertEvent.run(title, titleEn, date, time, location, locationEn, description, descriptionEn, image || '', link || '');
    
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
    const { title, titleEn, date, time, location, locationEn, description, descriptionEn, image, link } = req.body;
    
    const updateEvent = db.prepare(`
      UPDATE events 
      SET title = ?, titleEn = ?, date = ?, time = ?, location = ?, locationEn = ?, 
          description = ?, descriptionEn = ?, image = ?, link = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = updateEvent.run(title, titleEn, date, time, location, locationEn, description, descriptionEn, image || '', link || '', id);
    
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

app.get('/api/highlights', (req, res) => {
  try {
    const highlights = db.prepare(`
      SELECT * FROM highlights
      WHERE is_active = 1
      ${highlightOrder}
    `).all();
    res.json(highlights);
  } catch (error) {
    console.error('하이라이트 조회 오류:', error);
    res.status(500).json({ error: '하이라이트 조회에 실패했습니다.' });
  }
});

app.get('/api/highlights/all', (req, res) => {
  try {
    const highlights = db.prepare(`SELECT * FROM highlights ${highlightOrder}`).all();
    res.json(highlights);
  } catch (error) {
    console.error('하이라이트 전체 조회 오류:', error);
    res.status(500).json({ error: '하이라이트 조회에 실패했습니다.' });
  }
});

app.post('/api/highlights', (req, res) => {
  try {
    const { title, titleEn, meta, metaEn, description, descriptionEn, category, categoryEn, date, startDate, endDate, host, hostEn, image, link, icon, sort_order, is_active } = req.body;

    const insertHighlight = db.prepare(`
      INSERT INTO highlights (title, titleEn, meta, metaEn, description, descriptionEn, category, categoryEn, date, startDate, endDate, host, hostEn, image, link, icon, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertHighlight.run(
      title,
      titleEn,
      meta,
      metaEn,
      description,
      descriptionEn,
      category || '행사',
      categoryEn || 'Event',
      date || '',
      startDate || '',
      endDate || '',
      host || '비트코인 센터 서울',
      hostEn || 'Bitcoin Center Seoul',
      image || '',
      link || '',
      icon || 'calendar',
      Number(sort_order) || 0,
      is_active ? 1 : 0
    );

    res.json({
      id: result.lastInsertRowid,
      message: '하이라이트가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('하이라이트 생성 오류:', error);
    res.status(500).json({ error: '하이라이트 생성에 실패했습니다.' });
  }
});

app.put('/api/highlights/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, titleEn, meta, metaEn, description, descriptionEn, category, categoryEn, date, startDate, endDate, host, hostEn, image, link, icon, sort_order, is_active } = req.body;

    const updateHighlight = db.prepare(`
      UPDATE highlights
      SET title = ?, titleEn = ?, meta = ?, metaEn = ?, description = ?, descriptionEn = ?,
          category = ?, categoryEn = ?, date = ?, startDate = ?, endDate = ?, host = ?, hostEn = ?,
          image = ?, link = ?, icon = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const result = updateHighlight.run(
      title,
      titleEn,
      meta,
      metaEn,
      description,
      descriptionEn,
      category || '행사',
      categoryEn || 'Event',
      date || '',
      startDate || '',
      endDate || '',
      host || '비트코인 센터 서울',
      hostEn || 'Bitcoin Center Seoul',
      image || '',
      link || '',
      icon || 'calendar',
      Number(sort_order) || 0,
      is_active ? 1 : 0,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '하이라이트를 찾을 수 없습니다.' });
    }

    res.json({ message: '하이라이트가 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    console.error('하이라이트 업데이트 오류:', error);
    res.status(500).json({ error: '하이라이트 업데이트에 실패했습니다.' });
  }
});

app.delete('/api/highlights/:id', (req, res) => {
  try {
    const { id } = req.params;

    const deleteHighlight = db.prepare('DELETE FROM highlights WHERE id = ?');
    const result = deleteHighlight.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '하이라이트를 찾을 수 없습니다.' });
    }

    res.json({ message: '하이라이트가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('하이라이트 삭제 오류:', error);
    res.status(500).json({ error: '하이라이트 삭제에 실패했습니다.' });
  }
});

app.get('/api/highlight-images', (req, res) => {
  try {
    const highlightsDir = path.join(__dirname, 'public', 'images', 'highlights');
    const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
    const files = [];

    const walk = (directory) => {
      if (!fs.existsSync(directory)) return;

      fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          return;
        }

        if (imageExtensions.has(path.extname(entry.name).toLowerCase())) {
          files.push(`/${path.relative(path.join(__dirname, 'public'), fullPath).split(path.sep).join('/')}`);
        }
      });
    };

    walk(highlightsDir);
    res.json(files.sort());
  } catch (error) {
    console.error('하이라이트 이미지 목록 조회 오류:', error);
    res.status(500).json({ error: '하이라이트 이미지 목록 조회에 실패했습니다.' });
  }
});

app.post('/api/highlight-images', express.raw({
  type: (req) => req.headers['content-type']?.startsWith('image/') || false,
  limit: '20mb'
}), (req, res) => {
  try {
    if (!req.body?.length) {
      return res.status(400).json({ error: '업로드할 이미지가 없습니다.' });
    }

    const contentType = req.headers['content-type'] || '';
    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    const extension = extensionMap[contentType];

    if (!extension) {
      return res.status(400).json({ error: 'jpg, png, webp, gif 이미지만 업로드할 수 있습니다.' });
    }

    const uploadDir = path.join(__dirname, 'public', 'images', 'highlights', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    const rawName = decodeURIComponent(req.headers['x-file-name'] || 'highlight');
    const safeName = path.parse(rawName).name
      .replace(/[^a-zA-Z0-9가-힣_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'highlight';
    const fileName = `${Date.now()}-${safeName}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.body);
    res.json({ path: `/images/highlights/uploads/${fileName}` });
  } catch (error) {
    console.error('하이라이트 이미지 업로드 오류:', error);
    res.status(500).json({ error: '하이라이트 이미지 업로드에 실패했습니다.' });
  }
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅을 위한 fallback - 모든 경로에 대해 index.html 반환
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
  console.log(`http://localhost:${port}에서 확인하세요`);
});
