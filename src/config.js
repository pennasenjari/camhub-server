const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DATA_DIR = path.join(__dirname, "storage");

module.exports = {
  PORT: process.env.PORT || 3001,
  DATA_DIR,
  STREAMS_DIR: path.join(DATA_DIR, "streams"),
  SNAPSHOTS_DIR: path.join(DATA_DIR, "snapshots"),
  HEALTH_INTERVAL_MS: Number(process.env.HEALTH_INTERVAL_MS || 5000),
  AUTH_TOKEN: process.env.AUTH_TOKEN || "",
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  MEDIAMTX_RTSP_BASE: process.env.MEDIAMTX_RTSP_BASE || "rtsp://localhost:8554",
  WEBRTC_BASE_URL: process.env.WEBRTC_BASE_URL || "",
  AGENT_STALE_MS: Number(process.env.AGENT_STALE_MS || 15000)
};
