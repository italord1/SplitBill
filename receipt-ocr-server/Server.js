const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: 'No file uploaded' });

    // OCR לטקסט בעברית (שמות מנות)
    const { data: { text: hebText } } = await Tesseract.recognize(
      req.file.path,
      'heb',
      { logger: m => console.log('HEB:', m) }
    );

    // OCR למספרים (מחירים) באנגלית
    const { data: { text: numText } } = await Tesseract.recognize(
      req.file.path,
      'eng',
      { logger: m => console.log('NUM:', m) }
    );

    res.json({ hebText, numText });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'OCR failed' });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
