const express = require('express');
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

let worker;


(async () => {
  const worker = createWorker({
    logger: m => console.log(m),
  });

  await worker.loadLanguage('heb+eng');  
  await worker.initialize('heb+eng');   
  console.log('Worker ready');
})();


let ocrQueue = Promise.resolve();

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send({ error: 'No file uploaded' });

  const filePath = req.file.path;

 
  ocrQueue = ocrQueue.then(async () => {
    try {
      const { data: { text } } = await worker.recognize(filePath);
      await fs.unlink(filePath);
      res.json({ text });
    } catch (err) {
      console.error(err);
      await fs.unlink(filePath).catch(() => {});
      res.status(500).send({ error: 'OCR failed' });
    }
  });
});
  
app.listen(port, () =>
  console.log(`Server running at http://localhost:${port}`)
);
