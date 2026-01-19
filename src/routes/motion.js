const express = require("express");
const { MOTION_SNAPSHOT } = require("../config");
const { takeSnapshot } = require("../services/snapshots");

const router = express.Router();

router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { deviceUid, streamPath, ts, score } = req.body || {};

  if (!deviceUid) {
    res.status(400).json({ error: "deviceUid required" });
    return;
  }

  const camera = await db.get("SELECT * FROM cameras WHERE device_uid = ?", deviceUid);
  if (!camera) {
    res.status(404).json({ error: "camera not found" });
    return;
  }

  const eventTs = Number(ts) || Date.now();
  const now = Date.now();
  let snapshotPath = null;

  if (MOTION_SNAPSHOT) {
    try {
      const snapshot = await takeSnapshot({
        ...camera,
        stream_path: streamPath || camera.stream_path
      });
      snapshotPath = `/snapshots/${snapshot.filename}`;
    } catch (err) {
      // snapshot is optional for motion events
    }
  }

  await db.run(
    "INSERT INTO motion_events (camera_id, ts, score, snapshot_path, created_at) VALUES (?, ?, ?, ?, ?)",
    camera.id,
    eventTs,
    typeof score === "number" ? score : null,
    snapshotPath,
    now
  );

  await db.run("UPDATE cameras SET last_motion_at = ? WHERE id = ?", eventTs, camera.id);

  res.json({ ok: true });
});

router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const since = Number(req.query.since) || null;
  const cameraId = Number(req.query.cameraId) || null;

  const clauses = [];
  const params = [];
  if (cameraId) {
    clauses.push("camera_id = ?");
    params.push(cameraId);
  }
  if (since) {
    clauses.push("ts >= ?");
    params.push(since);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT * FROM motion_events ${where} ORDER BY ts DESC LIMIT ?`,
    ...params,
    limit
  );

  res.json(rows);
});

module.exports = router;
