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

    // Save temp file to disk
    const tempFilePath = path.join(os.tmpdir(), req.file.originalname);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    // Step 1: Transcribe audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    fs.unlinkSync(tempFilePath); // cleanup temp file

    const rawText = transcription.text;
    console.log("🎙️ Transcription done");

    // Step 2: Generate Minutes + Tasks
    const prompt = `
        You are an expert corporate meeting minutes generator.

        From the transcript below, produce a structured **Minutes of the Meeting (MoM)** but store it under the JSON key "summary".

        Respond ONLY in valid JSON in this exact format:

        {
          "summary": {
            "title": "Minutes of the Meeting",
            "date": "If date mentioned, else null",
            "participants": ["List of names if mentioned, else empty array"],
            "agenda": ["Agenda item 1", "Agenda item 2"],
            "discussion": [
              "Clear bullet-style discussion points summarizing what was talked about."
            ],
            "decisions": [
              "Final decisions or agreements made during the meeting."
            ],
            "actionItems": [
              "Action items mentioned explicitly during the meeting."
            ]
          },
          "tasks": [
            { "text": "Task description", "assigneeName": "Name or null" }
          ]
        }

        === GUIDELINES ===
        - "summary" MUST contain the full Minutes of the Meeting, not a generic summary.
        - Extract agenda items if mentioned; otherwise infer logically.
        - List participants only when clearly stated.
        - Keep discussion points concise and meaningful.
        - Decisions must only be final agreements.
        - Action items are commitments or responsibilities.
        - Tasks must be actionable and specific.
        - assigneeName must be the actual person mentioned; otherwise null.
        - DO NOT fabricate details that are not in the transcript.
        - DO NOT copy transcript text verbatim.
        - Output valid JSON only.

        Transcript:
        ${rawText}
      `;


    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    let structuredOutput = {};
    try {
      structuredOutput = JSON.parse(summaryResponse.choices[0].message.content);
    } catch (err) {
      console.warn("⚠️ GPT fallback: non-JSON response, parsing manually");

      const text = summaryResponse.choices[0].message?.content || "";

      const [minutesPart, taskPart] = text.split(/Tasks:/i);
      const tasks = (taskPart || "")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .map((line) => {
          const match = line.match(/-?\s*(.+?):\s*(.+)/);
          return match
            ? { text: match[2], assigneeName: match[1] }
            : { text: line.replace(/^-/, "").trim(), assigneeName: null };
        });

      structuredOutput = {
        minutes: minutesPart?.trim() || "No minutes generated.",
        tasks,
      };
    }

    console.log("✅ Structured Output:", structuredOutput);

    // Combined output for UI display
    const combinedDisplay = `${structuredOutput.minutes}\n\nTasks:\n${structuredOutput.tasks
      .map((t) => `- ${t.assigneeName ? t.assigneeName + ": " : ""}${t.text}`)
      .join("\n")}`;

    res.json({
      transcription: rawText,
      minutes: structuredOutput.minutes,
      tasks: structuredOutput.tasks,
      combinedDisplay,
    });
  } catch (error) {
    console.error("❌ Whisper+Minutes error:", error);
    res.status(500).json({
      error: "Transcription or minutes generation failed",
      details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
