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
      startDate TEXT NOT NULL DEFAULT '',
      endDate TEXT NOT NULL DEFAULT '',
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
  addColumn('startDate', "TEXT NOT NULL DEFAULT ''");
  addColumn('endDate', "TEXT NOT NULL DEFAULT ''");
  addColumn('host', "TEXT NOT NULL DEFAULT '비트코인 센터 서울'");
  addColumn('hostEn', "TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul'");
  addColumn('link', "TEXT NOT NULL DEFAULT ''");
  console.log('하이라이트 테이블이 생성되었습니다.');
};

const insertInitialData = () => {
  console.log('초기 이벤트 샘플 데이터 삽입을 건너뜁니다.');
};

const insertInitialHighlights = () => {
  console.log('초기 하이라이트 샘플 데이터 삽입을 건너뜁니다.');
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
