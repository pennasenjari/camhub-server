const express = require("express");
const { startStream, stopStream } = require("../services/ffmpeg");

const router = express.Router();

router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  const cameras = await db.all("SELECT * FROM cameras ORDER BY id DESC");
  res.json(cameras);
});

router.post("/", async (req, res) => {
  const db = req.app.locals.db;
  const { name, rtspUrl } = req.body || {};

  if (!name || !rtspUrl) {
    res.status(400).json({ error: "name and rtspUrl required" });
    return;
  }

  const now = Date.now();
  const result = await db.run(
    "INSERT INTO cameras (name, rtsp_url, enabled, status, created_at, source) VALUES (?, ?, 1, 'offline', ?, 'server')",
    name,
    rtspUrl,
    now
  );

  await db.run(
    "UPDATE cameras SET stream_path = ? WHERE id = ?",
    String(result.lastID),
    result.lastID
  );

  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", result.lastID);
  startStream(camera);
  res.status(201).json(camera);
});

router.post("/:id/enable", async (req, res) => {
  const db = req.app.locals.db;
  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", req.params.id);
  if (!camera) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.run("UPDATE cameras SET enabled = 1 WHERE id = ?", camera.id);
  if (camera.source !== "agent") {
    startStream(camera);
  }
  res.json({ ok: true });
});

router.post("/:id/disable", async (req, res) => {
  const db = req.app.locals.db;
  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", req.params.id);
  if (!camera) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.run("UPDATE cameras SET enabled = 0, status = 'offline' WHERE id = ?", camera.id);
  stopStream(camera.id);
  res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", req.params.id);
  if (!camera) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  stopStream(camera.id);
  await db.run("DELETE FROM cameras WHERE id = ?", camera.id);
  res.json({ ok: true });
});

module.exports = router;
