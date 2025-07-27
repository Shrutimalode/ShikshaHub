const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Use faster generateContent method
    const result = await model.generateContent(message);
    const response = result.response.text();

    console.log('Response:', response);
    res.json({ response });
  } catch (error) {
    console.error('Detailed error in chat controller:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
};

module.exports = {
  chat
};
