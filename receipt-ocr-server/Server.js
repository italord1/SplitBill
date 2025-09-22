const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });


const ocrWorker = createWorker({
  logger: m => console.log(m) 
});

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'No file uploaded' });

  try {
    const filePath = req.file.path;

    
    const { data: { text } } = await ocrWorker.recognize(filePath, 'heb+eng');

    await fs.unlink(filePath);

    res.json({ text });
  } catch (err) {
    console.error(err);
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }
    res.status(500).send({ error: 'OCR failed' });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
