import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBIQvBB6_0YAsI0S0Wr1BAbQtsbyzGn0j8");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
