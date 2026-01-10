const { AGENT_STALE_MS } = require("../config");
const { getStreamInfo } = require("./ffmpeg");

async function checkCameraHealth(db, camera) {
  if (camera.source === "agent") {
    if (!camera.last_seen) {
      await db.run("UPDATE cameras SET status = 'offline' WHERE id = ?", camera.id);
      return;
    }

    const age = Date.now() - camera.last_seen;
    const status = age > AGENT_STALE_MS ? "stale" : "online";
    await db.run("UPDATE cameras SET status = ? WHERE id = ?", status, camera.id);
    return;
  }

  const info = getStreamInfo(camera.id);
  if (!info) {
    await db.run("UPDATE cameras SET status = 'offline' WHERE id = ?", camera.id);
    return;
  }

  await db.run(
    "UPDATE cameras SET status = 'online', last_seen = ? WHERE id = ?",
    Date.now(),
    camera.id
  );
}

module.exports = { checkCameraHealth };
