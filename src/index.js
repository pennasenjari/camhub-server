const express = require("express");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const cors = require("cors");
const { initDb } = require("./db");
const {
  PORT,
  STREAMS_DIR,
  SNAPSHOTS_DIR,
  HEALTH_INTERVAL_MS,
  AUTH_TOKEN,
  WEBRTC_BASE_URL,
  MEDIAMTX_PATH,
  MEDIAMTX_ARGS,
  MEDIAMTX_AUTOSTART
} = require("./config");
const { startStream } = require("./services/ffmpeg");
const { checkCameraHealth } = require("./services/health");
const camerasRouter = require("./routes/cameras");
const snapshotsRouter = require("./routes/snapshots");
const streamsRouter = require("./routes/streams");
const agentsRouter = require("./routes/agents");
const motionRouter = require("./routes/motion");
const { spawn } = require("child_process");

const app = express();

let mediamtxProcess = null;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/streams")) {
      next();
      return;
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== AUTH_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  });
}

app.get("/api/config", (req, res) => {
  const webrtcBase = WEBRTC_BASE_URL || `http://${req.hostname}:8889`;
  res.json({ webrtcBase });
});

app.use("/api/cameras", camerasRouter);
app.use("/api/snapshots", snapshotsRouter);
app.use("/api/streams", streamsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/motion", motionRouter);

app.use("/streams", express.static(STREAMS_DIR));
app.use("/snapshots", express.static(SNAPSHOTS_DIR));
app.use("/", express.static(path.join(__dirname, "..", "..", "client")));

function startMediamtx() {
  if (!MEDIAMTX_AUTOSTART) return;
  if (mediamtxProcess) return;

  const args = MEDIAMTX_ARGS ? MEDIAMTX_ARGS.split(/\s+/).filter(Boolean) : [];
  mediamtxProcess = spawn(MEDIAMTX_PATH, args, { stdio: "inherit" });
  mediamtxProcess.on("exit", (code) => {
    mediamtxProcess = null;
    console.log(`mediamtx exited with code ${code}`);
  });
}

function stopMediamtx() {
  if (!mediamtxProcess) return;
  mediamtxProcess.kill("SIGTERM");
  mediamtxProcess = null;
}

async function start() {
  startMediamtx();

  fs.mkdirSync(STREAMS_DIR, { recursive: true });
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  const db = await initDb();
  app.locals.db = db;

  const cameras = await db.all("SELECT * FROM cameras WHERE enabled = 1 AND source = 'server'");
  cameras.forEach((camera) => startStream(camera));

  setInterval(async () => {
    const all = await db.all("SELECT * FROM cameras WHERE enabled = 1");
    for (const camera of all) {
      await checkCameraHealth(db, camera);
    }
  }, HEALTH_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`camhub server listening on ${PORT}`);
  });
}

process.on("SIGINT", () => {
  stopMediamtx();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopMediamtx();
  process.exit(0);
});

start();
