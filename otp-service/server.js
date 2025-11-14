import sgMail from "@sendgrid/mail";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory OTP store
const otpStore = {}; // { email: { otp: "123456", expiresAt: 1234567890 } }

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ----------------- SEND OTP -----------------
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  console.log("[SERVER] /send-otp request for:", email);

  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min expiry
  console.log("[SERVER] Generated OTP:", otp, "for email:", email);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL, // verified sender
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
  };

  try {
    await sgMail.send(msg);
    console.log("[SERVER] OTP email sent successfully to", email);
    res.json({ success: true });
  } catch (err) {
    console.error("[SERVER] Failed to send OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// ----------------- VERIFY OTP -----------------
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  console.log("[SERVER] /verify-otp request for:", email, "OTP:", otp);

  const record = otpStore[email];
  if (!record) {
    console.log("[SERVER] OTP not found for email:", email);
    return res.status(400).json({ success: false, error: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    console.log("[SERVER] OTP expired for email:", email);
    delete otpStore[email];
    return res.status(400).json({ success: false, error: "OTP expired" });
  }

  if (record.otp !== otp) {
    console.log("[SERVER] OTP mismatch for email:", email, "Expected:", record.otp);
    return res.status(400).json({ success: false, error: "OTP incorrect" });
  }

  console.log("[SERVER] OTP verified successfully for email:", email);
  delete otpStore[email]; // OTP verified, remove it
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`OTP service running on port ${PORT}`));
