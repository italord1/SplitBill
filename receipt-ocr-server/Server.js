const express = require('express');
const multer = require('multer');
const tesseract = require('tesseract.js');
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


    const { data: { text } } = await tesseract.recognize(filePath, 'heb+eng', {
      tessedit_char_whitelist: '0123456789אבגדהוזחטיכלמנסעפצקרשת', 
      oem: 1, 
      psm: 6  
    });

    await fs.unlink(filePath);

    res.json({ text });
  } catch (err) {
    console.error(err);
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch (_) { }
    }
    res.status(500).send({ error: 'OCR failed' });
  }
});

app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
