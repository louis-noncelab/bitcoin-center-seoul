import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, 'events.db');

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.exec(createTable);
  console.log('이벤트 테이블이 생성되었습니다.');
};

// 초기 데이터 삽입 (테이블이 비어있을 때만)
const insertInitialData = () => {
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
  }
};

// 데이터베이스 초기화
const initDatabase = () => {
  createEventsTable();
  insertInitialData();
};

// 데이터베이스 연결 종료
const closeDatabase = () => {
  db.close();
};

export { db, initDatabase, closeDatabase };
