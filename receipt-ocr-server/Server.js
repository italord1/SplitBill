const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const fs = require('fs').promises; 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'No file uploaded' });

  try {
    const filePath = req.file.path;

    const { data: { text: hebText } } = await Tesseract.recognize(
      filePath,
      'heb',
      { logger: m => console.log('HEB:', m) }
    );

    const { data: { text: numText } } = await Tesseract.recognize(
      filePath,
      'eng',
      { logger: m => console.log('NUM:', m) }
    );

    // delete the file after OCR is done
    await fs.unlink(filePath);

    res.json({ hebText, numText });
  } catch (err) {
    console.error(err);

    // cleanup file if error occurred
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch (_) {}
    }

    res.status(500).send({ error: 'OCR failed' });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
