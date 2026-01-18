const express = require("express");
const path = require("path");
const { takeSnapshot } = require("../services/snapshots");

const router = express.Router();

router.post("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", req.params.id);
  if (!camera) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const snapshot = await takeSnapshot(camera);
    res.json({ ok: true, path: `/snapshots/${snapshot.filename}`, filename: snapshot.filename });
  } catch (err) {
    res.status(500).json({ error: err.message || "Snapshot failed" });
  }
});

router.get("/:id", async (req, res) => {
  const filePath = path.join(__dirname, "..", "storage", "snapshots", `${req.params.id}.jpg`);
  res.sendFile(filePath);
});

module.exports = router;
