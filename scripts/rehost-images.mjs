#!/usr/bin/env node
// 외부 링크(X의 pbs.twimg.com 등)로 들어간 이벤트/하이라이트 이미지를 우리 서버로 옮긴다.
//
// 사용법:
//   node scripts/rehost-images.mjs <BASE_URL> <ADMIN_PASSWORD> [--dry-run] [--only=events|highlights]
//   예) node scripts/rehost-images.mjs https://bitcoincenterseoul.com 'secret' --dry-run
//
// 동작: 목록 GET → 외부 URL마다 가장 큰 원본 후보(name=orig → large → medium → small) 다운로드
//       → POST /api/images 로 업로드(서버가 1600px webp로 변환) → PUT 으로 image 경로만 교체.
// 되돌리기용으로 scripts/rehost-backup-<시각>.json 에 { table, id, before, after } 를 남긴다.
// 이미 /images/... 로컬 경로인 행은 건너뛰므로 여러 번 돌려도 안전하다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [base, token, ...flags] = process.argv.slice(2);
if (!base || !token) {
  console.error('사용법: node scripts/rehost-images.mjs <BASE_URL> <ADMIN_PASSWORD> [--dry-run] [--only=events|highlights]');
  process.exit(1);
}
const DRY = flags.includes('--dry-run');
const only = (flags.find((f) => f.startsWith('--only=')) || '').split('=')[1];
const BASE = base.replace(/\/$/, '');
const isExternal = (value) => /^https?:\/\//i.test(value || '');

// X 이미지 URL은 name= 파라미터로 크기가 갈린다. 큰 것부터 시도한다.
const candidates = (url) => {
  if (!/pbs\.twimg\.com/.test(url)) return [url];
  const original = new URL(url);
  return ['orig', 'large', 'medium', 'small'].map((size) => {
    const candidate = new URL(original);
    candidate.searchParams.set('name', size);
    return candidate.toString();
  });
};

const download = async (url) => {
  for (const candidate of candidates(url)) {
    try {
      const response = await fetch(candidate, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) continue;
      const type = response.headers.get('content-type') || '';
      if (!type.startsWith('image/')) continue;
      return { buffer: Buffer.from(await response.arrayBuffer()), type: type.split(';')[0], from: candidate };
    } catch {
      // 다음 후보로
    }
  }
  return null;
};

const upload = async ({ buffer, type }, fileName) => {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), fileName);
  const response = await fetch(`${BASE}/api/images`, { method: 'POST', headers: { 'x-admin-token': token }, body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `업로드 실패 (${response.status})`);
  return data;
};

const replaceImage = async (table, row, image) => {
  const response = await fetch(`${BASE}/api/${table}/${row.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ ...row, image }),
  });
  if (!response.ok) throw new Error(`PUT ${table}/${row.id} 실패 (${response.status}) ${await response.text()}`);
};

const tables = [
  ['events', '/api/events'],
  ['highlights', '/api/highlights/all'],
].filter(([table]) => !only || table === only);

const backup = [];
let done = 0;
let skipped = 0;
let failed = 0;

for (const [table, listPath] of tables) {
  const rows = await (await fetch(`${BASE}${listPath}`)).json();
  for (const row of rows) {
    if (!isExternal(row.image)) {
      skipped++;
      continue;
    }
    const label = `${table}#${row.id} ${String(row.title || '').slice(0, 24)}`;
    try {
      const file = await download(row.image);
      if (!file) {
        failed++;
        console.log(`FAIL ${label} — 다운로드 실패: ${row.image}`);
        continue;
      }
      const kb = Math.round(file.buffer.length / 1024);
      if (DRY) {
        console.log(`DRY  ${label} ← ${file.from} (${kb}KB)`);
        continue;
      }
      const slug = String(row.title || table).replace(/[^a-zA-Z0-9가-힣_-]+/g, '-').slice(0, 40) || table;
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const uploaded = await upload(file, `${slug}.${ext}`);
      await replaceImage(table, row, uploaded.path);
      backup.push({ table, id: row.id, before: row.image, after: uploaded.path, source: file.from });
      done++;
      console.log(`OK   ${label} → ${uploaded.path} (${uploaded.width}x${uploaded.height}, 원본 ${kb}KB)`);
    } catch (error) {
      failed++;
      console.log(`FAIL ${label} — ${error.message}`);
    }
  }
}

if (!DRY && backup.length) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.join(here, `rehost-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(out, JSON.stringify(backup, null, 2));
  console.log(`백업 파일: ${out}`);
}
console.log(`완료 ${done} · 건너뜀(이미 로컬 경로) ${skipped} · 실패 ${failed}${DRY ? ' (dry-run, 아무것도 바꾸지 않음)' : ''}`);
