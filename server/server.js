import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import OpenAI from "openai";
import os from "os";
import path from "path";

dotenv.config();

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Save temp file
    const tempFilePath = path.join(os.tmpdir(), req.file.originalname);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    // Transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    fs.unlinkSync(tempFilePath);

    const rawText = transcription.text;

    // Now generate the summary with tasks
    const prompt = `
      You are an assistant that summarizes meetings.
      Given the transcription below, create a meeting minutes summary.
      Include a separate "Tasks" section listing who will do what.

      Transcription:
      ${rawText}

      Output format:
      Meeting Minutes:
      - <summary points>

      Tasks:
      - <person>: <task>
    `;

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const summaryText = summaryResponse.choices[0].message?.content;

    res.json({
      transcription: rawText,
      summary: summaryText,
    });
  } catch (error) {
    console.error("Whisper+Summary error:", error);
    res.status(500).json({
      error: "Transcription or summarization failed",
      details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
