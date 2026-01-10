const { spawn } = require("child_process");
const { FFMPEG_PATH, MEDIAMTX_RTSP_BASE } = require("../config");

const processes = new Map();

function startStream(camera) {
  if (processes.has(camera.id)) return processes.get(camera.id);
  if (camera.source === "agent") return null;

  const streamPath = camera.stream_path || camera.id;
  const outputUrl = `${MEDIAMTX_RTSP_BASE}/${streamPath}`;

  const args = [
    "-rtsp_transport",
    "tcp",
    "-i",
    camera.rtsp_url,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "48",
    "-sc_threshold",
    "0",
    "-f",
    "rtsp",
    "-rtsp_transport",
    "tcp",
    outputUrl
  ];

  const proc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "ignore", "pipe"] });

  proc.stderr.on("data", (chunk) => {
    const line = chunk.toString().trim();
    if (line) console.error(`[ffmpeg:${camera.id}] ${line}`);
  });

  proc.on("exit", () => {
    processes.delete(camera.id);
  });

  processes.set(camera.id, { proc, outputUrl });
  return processes.get(camera.id);
}

function stopStream(cameraId) {
  const info = processes.get(cameraId);
  if (!info) return;
  info.proc.kill("SIGTERM");
  processes.delete(cameraId);
}

function getStreamInfo(cameraId) {
  return processes.get(cameraId);
}

module.exports = { startStream, stopStream, getStreamInfo };
