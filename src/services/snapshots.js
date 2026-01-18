const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { SNAPSHOTS_DIR, FFMPEG_PATH, MEDIAMTX_RTSP_BASE } = require("../config");

function ensureSnapshotsDir() {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;
}

function takeSnapshot(camera) {
  ensureSnapshotsDir();
  const filename = `${formatTimestamp(new Date())}.jpg`;
  const filePath = path.join(SNAPSHOTS_DIR, filename);
  const streamPath = camera.stream_path || camera.id;
  const rtspUrl = `${MEDIAMTX_RTSP_BASE.replace(/\/$/, "")}/${streamPath}`;

  return new Promise((resolve, reject) => {
    const args = [
      "-rtsp_transport",
      "tcp",
      "-timeout",
      "5000000",
      "-fflags",
      "nobuffer",
      "-flags",
      "low_delay",
      "-analyzeduration",
      "0",
      "-probesize",
      "32",
      "-i",
      rtspUrl,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "2",
      "-y",
      filePath
    ];

    const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) {
        stderr = stderr.slice(stderr.length - 8000);
      }
    });

    proc.on("exit", (code) => {
      if (code === 0) resolve({ filePath, filename });
      else reject(new Error(stderr.trim() || "Snapshot failed"));
    });
  });
}

module.exports = { takeSnapshot };
