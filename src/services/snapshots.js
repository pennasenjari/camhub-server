const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { SNAPSHOTS_DIR, FFMPEG_PATH } = require("../config");

function ensureSnapshotsDir() {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

function takeSnapshot(camera) {
  ensureSnapshotsDir();
  const filePath = path.join(SNAPSHOTS_DIR, `${camera.id}.jpg`);

  return new Promise((resolve, reject) => {
    const args = [
      "-rtsp_transport",
      "tcp",
      "-i",
      camera.rtsp_url,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-y",
      filePath
    ];

    const proc = spawn(FFMPEG_PATH, args, { stdio: "ignore" });

    proc.on("exit", (code) => {
      if (code === 0) resolve(filePath);
      else reject(new Error("Snapshot failed"));
    });
  });
}

module.exports = { takeSnapshot };
