const express = require("express");

const router = express.Router();

router.post("/register", async (req, res) => {
  const db = req.app.locals.db;
  const { host, cameras } = req.body || {};

  if (!host || !Array.isArray(cameras)) {
    res.status(400).json({ error: "host and cameras required" });
    return;
  }

  const now = Date.now();
  const results = [];

  for (const cam of cameras) {
    const { deviceUid, name, rtspUrl, streamPath } = cam || {};
    if (!deviceUid || !name || !rtspUrl || !streamPath) {
      continue;
    }

    const existing = await db.get("SELECT * FROM cameras WHERE device_uid = ?", deviceUid);
    if (existing) {
      await db.run(
        "UPDATE cameras SET name = ?, rtsp_url = ?, stream_path = ?, enabled = 1, source = 'agent', status = 'online', last_seen = ? WHERE id = ?",
        name,
        rtspUrl,
        streamPath,
        now,
        existing.id
      );
      results.push({ id: existing.id, deviceUid });
    } else {
      const result = await db.run(
        "INSERT INTO cameras (name, rtsp_url, device_uid, stream_path, source, enabled, status, created_at, last_seen) VALUES (?, ?, ?, ?, 'agent', 1, 'online', ?, ?)",
        name,
        rtspUrl,
        deviceUid,
        streamPath,
        now,
        now
      );
      results.push({ id: result.lastID, deviceUid });
    }
  }

  res.json({ ok: true, registered: results.length, cameras: results });
});

module.exports = router;
