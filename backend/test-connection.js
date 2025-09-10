const axios = require("axios");

const API_BASE = "http://localhost:3001/api";

async function testBackend() {
  console.log("🧪 Testing NagrikSetu Backend...\n");

  try {
    // Test 1: Health check
    console.log("1️⃣ Testing health check...");
    const healthResponse = await axios.get("http://localhost:3001/health");
    console.log("✅ Health check passed:", healthResponse.data.message);
  } catch (error) {
    console.log("❌ Health check failed - server might not be running");
    console.log("💡 Start the server with: cd backend && npm start");
    return;
  }

  try {
    // Test 2: Auth test endpoint
    console.log("\n2️⃣ Testing auth routes...");
    const authResponse = await axios.get(`${API_BASE}/auth/test`);
    console.log("✅ Auth routes working:", authResponse.data.message);
  } catch (error) {
    console.log(
      "❌ Auth routes test failed:",
      error.response?.data || error.message
    );
  }

  try {
    // Test 3: Test Google OAuth endpoint (should return 400 for missing token)
    console.log("\n3️⃣ Testing Google OAuth endpoint...");
    await axios.post(`${API_BASE}/auth/google`, {});
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(
        "✅ Google OAuth endpoint working (correctly rejected empty request)"
      );
    } else {
      console.log(
        "❌ Google OAuth endpoint test failed:",
        error.response?.data || error.message
      );
    }
  }

  console.log("\n🎉 Backend tests completed!");
  console.log("\n💡 Next steps:");
  console.log("1. Make sure MongoDB is running");
  console.log("2. Test login with Google OAuth");
  console.log("3. Check browser console for detailed logs");
}

testBackend().catch(console.error);
