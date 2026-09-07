import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import 'dotenv/config';
import multer from 'multer';
import sharp from 'sharp';
import { db, initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';
const highlightOrder = "ORDER BY COALESCE(NULLIF(endDate, ''), NULLIF(startDate, ''), REPLACE(date, '.', '-')) DESC, id DESC";

// JSON 파싱 미들웨어
app.use(express.json());

// 관리자 인증: .env 의 ADMIN_PASSWORD 와 x-admin-token 헤더를 비교한다.
// ADMIN_PASSWORD 가 없으면 예전 클라이언트 하드코딩 값으로 동작하되 경고를 남긴다(.env 설정 전 배포가 깨지지 않도록).
const LEGACY_ADMIN_PASSWORD = 'qlxmzhdlstpsxjtjdnf1021';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || LEGACY_ADMIN_PASSWORD;
if (!process.env.ADMIN_PASSWORD) {
  console.warn('[경고] ADMIN_PASSWORD 환경변수가 없어 예전 비밀번호로 동작합니다. .env 파일에 ADMIN_PASSWORD 를 설정하세요.');
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const requireAdmin = (req, res, next) => {
  const token = req.get('x-admin-token') || '';
  if (!token || !safeEqual(token, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: '관리자 인증이 필요합니다.' });
  }
  next();
};

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: '잘못된 암호입니다.' });
  }
  res.json({ ok: true });
});

// 이미지 업로드 설정: 메모리로 받아 sharp 로 변환한 뒤 public/images/uploads/YYYY-MM/ 에 저장한다.
const UPLOAD_ROOT = path.join(__dirname, 'public', 'images', 'uploads');
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('jpg, png, webp, gif, avif 이미지만 업로드할 수 있습니다.'));
  },
});
const slugify = (name) =>
  path.parse(name).name.replace(/[^a-zA-Z0-9가-힣_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';

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

app.post('/api/events', requireAdmin, (req, res) => {
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

app.put('/api/events/:id', requireAdmin, (req, res) => {
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

app.delete('/api/events/:id', requireAdmin, (req, res) => {
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

app.post('/api/highlights', requireAdmin, (req, res) => {
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
    res.status(500).json({ error: error.message || '하이라이트 생성에 실패했습니다.' });
  }
});

app.put('/api/highlights/:id', requireAdmin, (req, res) => {
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
    res.status(500).json({ error: error.message || '하이라이트 업데이트에 실패했습니다.' });
  }
});

app.delete('/api/highlights/:id', requireAdmin, (req, res) => {
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

// 이미지 업로드: multipart/form-data 의 file 필드 하나.
// EXIF 회전을 보정하고 긴 변 1600px webp 로 저장하며, 480px 썸네일도 함께 만든다. 원본은 보관하지 않는다.
app.post('/api/images', requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '이미지는 20MB 이하만 업로드할 수 있습니다.' });
      }
      return res.status(400).json({ error: err.message || '업로드 요청이 올바르지 않습니다.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '업로드할 이미지가 없습니다.' });
    }

    try {
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      const dir = path.join(UPLOAD_ROOT, month);
      fs.mkdirSync(dir, { recursive: true });

      const base = `${Date.now()}-${slugify(req.file.originalname)}-${crypto.randomBytes(3).toString('hex')}`;
      const source = sharp(req.file.buffer, { failOn: 'none' }).rotate();
      const original = await source.metadata();
      const main = await source
        .clone()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(dir, `${base}.webp`));
      await source
        .clone()
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(dir, `${base}-thumb.webp`));

      res.json({
        path: `/images/uploads/${month}/${base}.webp`,
        thumb: `/images/uploads/${month}/${base}-thumb.webp`,
        width: main.width,
        height: main.height,
        bytes: main.size,
        original: { width: original.width, height: original.height, type: req.file.mimetype, bytes: req.file.size },
      });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ error: '이미지 처리에 실패했습니다. 파일이 손상됐거나 지원하지 않는 형식일 수 있습니다.' });
    }
  });
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

// SPA 라우팅을 위한 fallback - 모든 경로에 대해 index.html 반환
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, host, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
  console.log(`http://${host}:${port}에서 확인하세요`);
});
