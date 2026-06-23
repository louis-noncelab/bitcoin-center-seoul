import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 파일 경로 (절대 경로 사용)
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'events.db');

// data 디렉토리가 없으면 생성
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('data 디렉토리가 생성되었습니다.');
}

// 데이터베이스 연결
const db = new Database(dbPath);

// 이벤트 테이블 생성
const createEventsTable = () => {
  const createTable = `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      titleEn TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      locationEn TEXT NOT NULL,
      description TEXT NOT NULL,
      descriptionEn TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      link TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.exec(createTable);

  const columns = db.prepare('PRAGMA table_info(events)').all().map((column) => column.name);
  if (!columns.includes('link')) {
    db.exec("ALTER TABLE events ADD COLUMN link TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.includes('image')) {
    db.exec("ALTER TABLE events ADD COLUMN image TEXT NOT NULL DEFAULT ''");
  }

  console.log('이벤트 테이블이 생성되었습니다.');
};

const createHighlightsTable = () => {
  const createTable = `
    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      titleEn TEXT NOT NULL,
      meta TEXT NOT NULL,
      metaEn TEXT NOT NULL,
      description TEXT NOT NULL,
      descriptionEn TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '행사',
      categoryEn TEXT NOT NULL DEFAULT 'Event',
      date TEXT NOT NULL DEFAULT '',
      host TEXT NOT NULL DEFAULT '비트코인 센터 서울',
      hostEn TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul',
      image TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'calendar',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.exec(createTable);

  const columns = db.prepare('PRAGMA table_info(highlights)').all().map((column) => column.name);
  const addColumn = (name, definition) => {
    if (!columns.includes(name)) {
      db.exec(`ALTER TABLE highlights ADD COLUMN ${name} ${definition}`);
    }
  };

  addColumn('category', "TEXT NOT NULL DEFAULT '행사'");
  addColumn('categoryEn', "TEXT NOT NULL DEFAULT 'Event'");
  addColumn('date', "TEXT NOT NULL DEFAULT ''");
  addColumn('host', "TEXT NOT NULL DEFAULT '비트코인 센터 서울'");
  addColumn('hostEn', "TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul'");
  addColumn('link', "TEXT NOT NULL DEFAULT ''");
  console.log('하이라이트 테이블이 생성되었습니다.');
};

// 초기 데이터 삽입 (테이블이 비어있을 때만)
const insertInitialData = () => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM events').get();
    
    if (count.count === 0) {
      const insertEvent = db.prepare(`
        INSERT INTO events (title, titleEn, date, time, location, locationEn, description, descriptionEn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // 샘플 데이터 삽입
      insertEvent.run(
        '대관 예약',
        'Event Rental',
        '2025-10-25',
        '16:00 - 20:00',
        '비트코인 센터 서울',
        'Bitcoin Center Seoul',
        '해당 시간에는 센터 입장이 불가능합니다.',
        'The center is closed during this time.'
      );
      
      insertEvent.run(
        '대관 예약',
        'Event Rental',
        '2025-09-12',
        '16:00 - 20:00',
        '비트코인 센터 서울',
        'Bitcoin Center Seoul',
        '해당 시간에는 센터 입장이 불가능합니다.',
        'The center is closed during this time.'
      );
      
      console.log('초기 이벤트 데이터가 삽입되었습니다.');
    } else {
      console.log(`기존 이벤트 데이터가 ${count.count}개 있습니다.`);
    }
  } catch (error) {
    console.error('초기 데이터 삽입 오류:', error);
  }
};

const insertInitialHighlights = () => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM highlights').get();

    if (count.count === 0) {
      const insertHighlight = db.prepare(`
        INSERT INTO highlights (title, titleEn, meta, metaEn, description, descriptionEn, category, categoryEn, date, host, hostEn, image, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const highlights = [
        [
          '비트코인 개발자 밋업',
          'Bitcoin Developer Meetup',
          '개발자 커뮤니티',
          'Developer Community',
          '비트코인 개발자들이 모여 기술 주제를 나누는 시간입니다.',
          'Bitcoin developers gather to discuss technical topics.',
          '밋업',
          'Meetup',
          '2026.04.19',
          '비트코인 센터 서울',
          'Bitcoin Center Seoul',
          '/images/highlights/행사/비트코인 개발자 밋업.jpeg',
          'calendar',
          1
        ],
        [
          '셀프 커스터디 강의',
          'Self-Custody Class',
          '교육 프로그램',
          'Education Program',
          '비트코인을 스스로 안전하게 보관하는 방법을 배웁니다.',
          'Learn how to safely self-custody Bitcoin.',
          '강의',
          'Class',
          '2026.03.27',
          'Coconut',
          'Coconut',
          '/images/highlights/행사/1분 비트코인 셀프 커스터디 강의.png',
          'code',
          2
        ],
        [
          'Movie Night',
          'Bitcoin Movie Night',
          '커뮤니티 행사',
          'Community Event',
          '비트코인과 관련된 영화를 함께 보고 이야기합니다.',
          'Watch Bitcoin-related films and discuss them together.',
          '행사',
          'Event',
          '2026.03.08',
          'Saturday Block',
          'Saturday Block',
          '/images/highlights/행사/MOBIE NIGHT.png',
          'movie',
          3
        ],
        [
          '비트코인 프로토콜 강의',
          'Bitcoin Protocol Course',
          '정규 교육',
          'Education',
          '비트코인의 구조와 프로토콜을 깊이 있게 학습합니다.',
          'Dive deeper into Bitcoin structure and protocol.',
          '강의',
          'Class',
          '2026.05.17',
          '비트코인 센터 서울',
          'Bitcoin Center Seoul',
          '/images/highlights/행사/5월 17일 비트코인 프로토콜 강의 3기.jpg',
          'users',
          4
        ],
        [
          '리스펙 토크 콘서트',
          'Respect Talk Concert',
          '토크 콘서트',
          'Talk Concert',
          '비트코인 커뮤니티와 함께 이야기를 나누는 행사입니다.',
          'A community event for Bitcoin conversations.',
          '행사',
          'Event',
          '2026.04.19',
          '리스펙',
          'Respect',
          '/images/highlights/행사/리스펙 비트코인 토크 콘서트 2기.PNG',
          'wallet',
          5
        ],
        [
          '코워킹 데이',
          'Coworking Day',
          '코워킹',
          'Coworking',
          '비트코이너들이 함께 일하고 교류하는 시간입니다.',
          'Bitcoiners work and connect together at the center.',
          '행사',
          'Event',
          '2026.04.10',
          '비트코인 센터 서울',
          'Bitcoin Center Seoul',
          '/images/highlights/코워킹/2026.04.10.png',
          'handshake',
          6
        ],
      ];

      highlights.forEach((highlight) => insertHighlight.run(...highlight));
      console.log('초기 하이라이트 데이터가 삽입되었습니다.');
    } else {
      console.log(`기존 하이라이트 데이터가 ${count.count}개 있습니다.`);
    }
  } catch (error) {
    console.error('초기 하이라이트 데이터 삽입 오류:', error);
  }
};

// 데이터베이스 초기화
const initDatabase = () => {
  createEventsTable();
  createHighlightsTable();
  insertInitialData();
  insertInitialHighlights();
};

// 데이터베이스 연결 종료
const closeDatabase = () => {
  db.close();
};

export { db, initDatabase, closeDatabase };
