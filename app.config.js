import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
    },
  };
};
