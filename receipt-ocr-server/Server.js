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

   
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'heb', { logger: m => console.log(m) });

    
    const dishes = [];
    text.split('\n').forEach(line => {
      const match = line.match(/(.+)\s+([\d.,]+)$/);
      if (match) {
        dishes.push({
          name: match[1].trim(),
          price: parseFloat(match[2].replace(',', '.'))
        });
      }
    });

    res.json({ text, dishes });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'OCR failed' });
  }
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
