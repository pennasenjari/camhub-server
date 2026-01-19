const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let db;

async function initDb() {
  if (db) return db;
  db = await open({
    filename: path.join(__dirname, "storage", "camhub.sqlite"),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rtsp_url TEXT NOT NULL,
      device_uid TEXT,
      stream_path TEXT,
      source TEXT NOT NULL DEFAULT 'server',
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'offline',
      last_seen INTEGER,
      last_motion_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS motion_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      score REAL,
      snapshot_path TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const columns = await db.all("PRAGMA table_info(cameras)");
  const existing = new Set(columns.map((col) => col.name));

  if (!existing.has("device_uid")) {
    await db.exec("ALTER TABLE cameras ADD COLUMN device_uid TEXT");
  }
  if (!existing.has("stream_path")) {
    await db.exec("ALTER TABLE cameras ADD COLUMN stream_path TEXT");
  }
  if (!existing.has("source")) {
    await db.exec("ALTER TABLE cameras ADD COLUMN source TEXT NOT NULL DEFAULT 'server'");
  }
  if (!existing.has("last_motion_at")) {
    await db.exec("ALTER TABLE cameras ADD COLUMN last_motion_at INTEGER");
  }

  await db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_cameras_device_uid ON cameras(device_uid)"
  );
  await db.exec("CREATE INDEX IF NOT EXISTS idx_motion_events_camera_id ON motion_events(camera_id)");
  await db.exec("CREATE INDEX IF NOT EXISTS idx_motion_events_ts ON motion_events(ts)");

  return db;
}

module.exports = { initDb };
