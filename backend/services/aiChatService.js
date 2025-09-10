const axios = require("axios");

// Helper function to provide contextual suggestions
function getHelpfulSuggestions(userMessage) {
  const message = userMessage.toLowerCase();

  if (
    message.includes("report") ||
    message.includes("submit") ||
    message.includes("issue")
  ) {
    return "💡 Go to /report to submit issues with photos.";
  }

  if (
    message.includes("map") ||
    message.includes("view") ||
    message.includes("see")
  ) {
    return "🗺️ Check /map for live issue tracking.";
  }

  if (
    message.includes("dashboard") ||
    message.includes("track") ||
    message.includes("status")
  ) {
    return "📊 Visit /dashboard/user to track your reports.";
  }

  if (
    message.includes("login") ||
    message.includes("sign in") ||
    message.includes("account")
  ) {
    return "🔐 Use Google OAuth to sign in quickly.";
  }

  if (
    message.includes("photo") ||
    message.includes("image") ||
    message.includes("upload")
  ) {
    return "📸 Upload photos for AI analysis.";
  }

  if (
    message.includes("admin") ||
    message.includes("manage") ||
    message.includes("verify")
  ) {
    return "⚙️ Admins can verify reports and assign contractors.";
  }

  if (
    message.includes("points") ||
    message.includes("level") ||
    message.includes("bronze") ||
    message.includes("silver") ||
    message.includes("gold")
  ) {
    return "🏆 Earn points: Bronze → Silver → Gold → Platinum.";
  }

  return null;
}

async function sendAIChatMessage({ message, userId }) {
  console.log("AI Chat Service called with:", { message, userId });
  const geminiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your-gemini-api-key";
  if (!geminiKey) {
    return `Hi! I'm your NagrikSetu Civic Assistant. Gemini API key is not configured. Please contact support.`;
  }
  try {
    // Use Gemini 1.5 Flash for chat
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY;
    const body = {
      contents: [
        {
          parts: [
            {
              text: `You are a professional AI assistant for NagrikSetu (civic issue platform). Give CONCISE, CLEAR, and PERFECT answers.\n\nRULES:\n- Keep responses to 1-2 sentences maximum\n- Be direct and actionable\n- Use simple, clear language\n- Focus on the most important information\n- Be helpful and professional\n\nCapabilities:\n- Report civic issues: potholes, street lights, trash/sanitation, drainage/sewer, water supply leaks, vandalism, tree fall, parking, noise, public property damage, and more.\n- Upload photos for AI analysis (auto-categorize).\n- View live map of issues.\n- Track report status and response times.\n\nWhen useful, add one short suggestion like: \"Go to /report to submit with photo\" or \"Check /map for live tracking\".\n\nUser message: ${message}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 120,
        topP: 0.8,
        topK: 40,
      },
    };
    const response = await require("axios").post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    const responseText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      let finalResponse = responseText.trim();
      if (finalResponse.length > 200) {
        finalResponse = finalResponse.substring(0, 197) + "...";
      }
      return finalResponse;
    } else {
      throw new Error("No response from Gemini API");
    }
  } catch (error) {
    if (error.response?.status === 429) {
      return `Sorry, the Gemini AI service quota has been exceeded. Please try again later when your quota resets.`;
    }
    return `Sorry, the Gemini AI service is temporarily unavailable. Please try again later.`;
  }
}

module.exports = { sendAIChatMessage };
