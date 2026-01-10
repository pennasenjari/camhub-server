const express = require("express");
const { WEBRTC_BASE_URL } = require("../config");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const db = req.app.locals.db;
  const camera = await db.get("SELECT * FROM cameras WHERE id = ?", req.params.id);
  if (!camera) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const base = WEBRTC_BASE_URL || `http://${req.hostname}:8889`;
  const streamPath = camera.stream_path || camera.id;
  res.json({
    whep: `${base}/${streamPath}/whep`,
    webrtcBase: base
  });
});

module.exports = router;
