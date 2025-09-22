const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

// יוצרים workers קבועים פעם אחת
let hebWorker, engWorker;
(async () => {
  hebWorker = await createWorker('heb');
  engWorker = await createWorker('eng');
  console.log('Workers loaded');
})();

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'No file uploaded' });

  try {
    const filePath = req.file.path;


    const { data: { text: hebText } } = await hebWorker.recognize(filePath);

   
    const { data: { text: numText } } = await engWorker.recognize(filePath);

    await fs.unlink(filePath);

    res.json({ hebText, numText });
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
