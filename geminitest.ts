import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyBIQvBB6_0YAsI0S0Wr1BAbQtsbyzGn0j8");

async function testGemini() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("why are we still here. just to suffer?");
        console.log(result.response.text());
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testGemini();
