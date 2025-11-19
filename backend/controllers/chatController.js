const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return res.status(500).json({ error: 'AI service is not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Use faster generateContent method
    const result = await model.generateContent(message);
    const response = result.response;
    const text = response.text();

    console.log('Chatbot response generated successfully');
    res.json({ response: text });
  } catch (error) {
    console.error('Detailed error in chat controller:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      details: error.message 
    });
  }
};

module.exports = {
  chat
};
