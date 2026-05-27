// backend/src/resetPasswords.js
const mongoose = require('mongoose');

// Manually load dotenv just in case
require('dotenv').config();

// We wrap everything in a self-invoking function so we can catch ALL errors
(async () => {
  try {
    // 1. Verify the URI exists
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is undefined. Check your .env file in the backend folder.");
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // Require the model AFTER connecting
    const User = require('./models/User');

    console.log('🔍 Fetching all users...');
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('⚠️ No users found in the database to update.');
      process.exit(0);
    }

    console.log(`✅ Found ${users.length} users. Starting password reset...`);

    let successCount = 0;
    for (const user of users) {
      user.password = 'STIP@2026';
      
      if (user.security) {
        user.security.isFirstLogin = true; 
      }

      await user.save();
      successCount++;
      
      if (successCount % 50 === 0) {
        console.log(`⏳ Reset passwords for ${successCount} users...`);
      }
    }

    console.log(`🎉 Success! Passwords for all ${successCount} users have been reset to "STIP@2026".`);
    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(error);
    process.exit(1);
  }
})();