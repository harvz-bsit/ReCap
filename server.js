import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

app.post("/transcribe", async (req, res) => {
  const { audioBase64 } = req.body;

  try {
    const response = await fetch(
      "https://speech.googleapis.com/v1/speech:recognize?key=" + process.env.GOOGLE_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "LINEAR16",
            sampleRateHertz: 44100,
            languageCode: "en-US",
          },
          audio: { content: audioBase64 },
        }),
      }
    );

    const data = await response.json();
    const transcript = data.results?.map(r => r.alternatives[0].transcript).join(" ") || "";
    res.json({ transcript });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
