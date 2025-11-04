import { exec } from 'child_process';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';

const app = express();
app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/transcribe', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;

    console.log('Received audio:', filePath);
    try {
        exec(`whisper ${filePath} --model base --language en --output_format json`, (error, stdout, stderr) => {
            if (error) {
                console.error('Whisper error:', stderr);
                return res.status(500).json({ error: 'Whisper failed.' });
            }

            const outputFile = `${filePath}.json`;
            if (fs.existsSync(outputFile)) {
                const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
                res.json({ text: result.text });
            } else {
                res.status(500).json({ error: 'No transcription output found.' });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(5000, () => console.log('Whisper server running on port 5000'));
