const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ensure downloads folder exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR);
}

// Serve frontend
app.get('/web', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/', (req, res) => {
  res.send('✅ YouTube Downloader API is live.');
});

// Main download route
app.get('/api/download', (req, res) => {
  const { url, format } = req.query;

  if (!url || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL' });
  }

  const ext = format === 'mp4' ? 'mp4' : 'mp3';
  const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');

  const command = ext === 'mp3'
    ? `yt-dlp --extract-audio --audio-format mp3 -o "${outputTemplate}" "${url}"`
    : `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" -o "${outputTemplate}" "${url}"`;

  console.log('▶️ Running command:', command);

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ yt-dlp error:', stderr || err.message);
      return res.status(500).json({ error: 'Download failed', details: stderr || err.message });
    }

    fs.readdir(DOWNLOADS_DIR, (fsErr, files) => {
      if (fsErr || files.length === 0) {
        return res.status(500).json({ error: 'Download failed — no file found' });
      }

      const latest = files
        .map(name => ({
          name,
          time: fs.statSync(path.join(DOWNLOADS_DIR, name)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)[0].name;

      const filePath = path.join(DOWNLOADS_DIR, latest);
      res.download(filePath, latest, err => {
        if (!err) fs.unlink(filePath, () => {});
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 Web interface: http://localhost:${PORT}/web`);
});