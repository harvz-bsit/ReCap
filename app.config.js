import 'dotenv/config';

export default {
  expo: {
    name: 'umak',
    slug: 'umak',
    version: '1.0.0',
    extra: {
      openAiKey: process.env.EXPO_OPENAI_API_KEY,
    },
  },
};
