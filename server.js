// server.js
const express = require("express");
const cors = require("cors");
const { execSync, spawn } = require("child_process");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static("public"));

// 🔧 Ensure yt-dlp is available
try {
  execSync("which yt-dlp", { stdio: "ignore" });
} catch {
  console.log("yt-dlp not found. Downloading...");
  execSync("curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp");
}

// ✅ Test root
app.get("/", (req, res) => {
  res.send("🎵 YouTube Music API is running...");
});

// 🧠 Get video info
app.get("/info", (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: "Missing YouTube URL" });

  const yt = spawn("yt-dlp", ["--dump-json", videoURL]);

  let data = "";
  yt.stdout.on("data", chunk => data += chunk);
  yt.stderr.on("data", err => console.error("yt-dlp error:", err.toString()));

  yt.on("close", code => {
    if (code !== 0) return res.status(500).json({ error: "yt-dlp failed" });
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (err) {
      res.status(500).json({ error: "Failed to parse JSON" });
    }
  });
});

// 🎵 Stream/download audio or video
app.get("/api/download", (req, res) => {
  const { url, format } = req.query;
  if (!url || !["mp3", "mp4"].includes(format)) {
    return res.status(400).json({ error: "Invalid URL or format" });
  }

  const args = [
    "-f",
    format === "mp3" ? "bestaudio" : "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4",
    "-o",
    "-",
    url
  ];

  if (format === "mp3") args.unshift("-x", "--audio-format", "mp3");

  const yt = spawn("yt-dlp", args);

  res.setHeader("Content-Disposition", `inline; filename="media.${format}"`);
  res.setHeader("Content-Type", format === "mp3" ? "audio/mpeg" : "video/mp4");

  yt.stdout.pipe(res);
  yt.stderr.on("data", err => console.error("Download error:", err.toString()));
  yt.on("error", () => res.status(500).json({ error: "Download failed" }));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
