const mongoose = require("mongoose");
const User = require("../models/User");
const Admin = require("../models/Admin");
require("dotenv").config();

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/nagrikSetu"
    );
    console.log("✅ Connected to MongoDB");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("✅ Admin user already exists:", existingAdmin.email);
      return;
    }

    // Create admin user
    const adminUser = new User({
      email: "admin@nagrikSetu.com",
      name: "NagrikSetu Admin",
      role: "admin",
      isVerified: true,
      isActive: true,
    });

    await adminUser.save();
    console.log("✅ Admin user created:", adminUser.email);

    // Create admin record
    const adminRecord = new Admin({
      user: adminUser._id,
      permissions: [
        "view_reports",
        "edit_reports",
        "delete_reports",
        "verify_reports",
        "assign_contractors",
        "manage_users",
        "view_analytics",
        "manage_settings",
        "super_admin",
      ],
      role: "super_admin",
      isActive: true,
    });

    await adminRecord.save();
    console.log("✅ Admin record created with full permissions");

    console.log("\n🎉 Admin setup complete!");
    console.log("📧 Email notifications will now be sent to:", adminUser.email);
    console.log(
      "💡 You can change this email in the database or create additional admin users"
    );
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
createAdminUser();
