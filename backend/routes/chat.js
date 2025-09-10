const express = require('express');
const router = express.Router();
const { sendAIChatMessage } = require('../services/aiChatService');
const asyncHandler = require('express-async-handler');

// Test route to verify the chat endpoint is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Chat endpoint is working' });
});

// Health check route
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Chat service is healthy',
    timestamp: new Date().toISOString()
  });
});

// @route POST /api/chat
// @desc  Send a chat message to AI
// @access Public (no authentication required)
router.post('/', asyncHandler(async (req, res) => {
  console.log('Chat request received:', req.body);
  
  const { message } = req.body;
  const userId = req.user?._id || 'anonymous';
  
  if (!message || !message.trim()) {
    console.log('No message provided');
    return res.status(400).json({ 
      success: false, 
      error: { message: 'Message is required' } 
    });
  }
  
  try {
    console.log('Calling AI service with message:', message);
    const aiResponse = await sendAIChatMessage({ message: message.trim(), userId });
    console.log('AI response received:', aiResponse.substring(0, 100) + '...');
    
    res.json({ success: true, data: { response: aiResponse } });
  } catch (error) {
    console.error('Chat error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: { message: error.message || 'Internal server error' } 
    });
  }
}));

module.exports = router; 