// /src/storage.js
import Database from 'better-sqlite3';

const db = new Database('bridge.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    source_url TEXT PRIMARY KEY,
    last_item_id TEXT,
    last_checked_at TEXT NOT NULL
  )
`);

const selectStmt = db.prepare('SELECT last_item_id FROM sources WHERE source_url = ?');
const upsertStmt = db.prepare(`
    INSERT INTO sources (source_url, last_item_id, last_checked_at)
    VALUES (@sourceUrl, @itemId, @now)
    ON CONFLICT(source_url) DO UPDATE SET
      last_item_id = excluded.last_item_id,
      last_checked_at = excluded.last_checked_at;
`);

export function getLastItem(sourceUrl) {
  const result = selectStmt.get(sourceUrl);
  return result ? result.last_item_id : null;
}

export function setLastItem(sourceUrl, itemId) {
  const now = new Date().toISOString();
  upsertStmt.run({ sourceUrl, itemId, now });
  console.log(`[Storage] Fonte atualizada: ${sourceUrl}`);
}