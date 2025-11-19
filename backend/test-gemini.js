const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key configured:', process.env.GEMINI_API_KEY ? 'YES' : 'NO');
    
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: GEMINI_API_KEY not found in environment variables');
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Test with gemini-2.0-flash
    console.log('\nTesting gemini-2.0-flash model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Sending test request...');
    const result = await model.generateContent('Say hello in one sentence');
    const response = result.response;
    const text = response.text();

    console.log('✅ SUCCESS! Gemini API is working!');
    console.log('Response:', text);
    
    // Test blog summarization
    console.log('\n--- Testing Blog Summarization ---');
    const blogContent = 'This is a test blog post about artificial intelligence. AI is transforming the world.';
    const summaryPrompt = `Please provide a concise summary of the following blog post in 2-3 sentences:\n\n${blogContent}`;
    const summaryResult = await model.generateContent(summaryPrompt);
    const summaryText = summaryResult.response.text();
    console.log('Summary:', summaryText);
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ ERROR testing Gemini API:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testGemini();
