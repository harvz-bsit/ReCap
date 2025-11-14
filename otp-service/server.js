import cors from "cors";
import express from "express";
import nodemailer from "nodemailer";

const app = express();
app.use(cors());
app.use(express.json());

// ----------------- IN-MEMORY OTP STORE -----------------
const otpStore = {}; // { email: { otp: "123456", expiresAt: timestamp } }

// ----------------- SENDGRID TRANSPORTER -----------------
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey", // this is literal "apikey"
    pass: process.env.SENDGRID_API_KEY,
  },
});

// ----------------- OTP GENERATOR -----------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ----------------- SEND OTP -----------------
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 minutes

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM, // must be verified in SendGrid
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
    });

    console.log(`[SERVER] OTP sent to ${email}: ${otp}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[SERVER] Failed to send OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ----------------- VERIFY OTP -----------------
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];

  if (!record) return res.status(400).json({ success: false, message: "OTP not found" });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (record.otp !== otp) return res.status(400).json({ success: false, message: "OTP incorrect" });

  delete otpStore[email]; // verified
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[SERVER] OTP service running on port ${PORT}`));
