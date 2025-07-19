const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🎵 YouTube Music API is running...');
});

app.get('/info', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing URL');

  exec(`yt-dlp -J "${url}"`, (err, stdout, stderr) => {
    if (err) return res.status(500).send(stderr);
    try {
      res.json(JSON.parse(stdout));
    } catch (e) {
      res.status(500).send("Failed to parse JSON");
    }
  });
});

app.get('/stream', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing URL');

  const command = `yt-dlp -f bestaudio -o - "${url}"`;
  const stream = exec(command, { maxBuffer: 1024 * 1024 * 10 });

  res.setHeader('Content-Type', 'audio/mpeg');
  stream.stdout.pipe(res);
  stream.stderr.on('data', data => console.error(data.toString()));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
