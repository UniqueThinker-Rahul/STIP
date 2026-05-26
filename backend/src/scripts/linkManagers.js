require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Atlas Connected for Linking...'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ... rest of the file stays exactly the same

async function establishHierarchy() {
  try {
    // Find all users who have a manager name listed, but haven't been linked yet
    const users = await User.find({ 
      'employmentDetails.rawManagerName': { $ne: null, $ne: '' },
      'employmentDetails.reportingTo': null 
    });

    console.log(`Found ${users.length} staff members needing manager links.`);

    let successCount = 0;
    let missingCount = 0;

    for (let user of users) {
      const rawName = user.employmentDetails.rawManagerName; // e.g., "Adolph, Johnny"

      // The CSV formats names as "LastName, FirstName"
      const nameParts = rawName.split(',');
      
      if (nameParts.length === 2) {
        const lastName = nameParts[0].trim();
        const firstName = nameParts[1].trim();

        // Search the database for the manager using case-insensitive Regex
        const manager = await User.findOne({
          'personalDetails.lastName': new RegExp(`^${lastName}$`, 'i'),
          'personalDetails.firstName': new RegExp(`^${firstName}$`, 'i')
        });

        if (manager) {
          // Link established: Update the reportingTo field with the Manager's actual ObjectId
          user.employmentDetails.reportingTo = manager._id;
          
          // Optional cleanup: remove the raw string now that we have the strict DB link
          user.employmentDetails.rawManagerName = undefined; 
          
          await user.save();
          successCount++;
          console.log(`✅ Linked: ${user.personalDetails.firstName} ${user.personalDetails.lastName} -> Reports to ${firstName} ${lastName}`);
        } else {
          missingCount++;
          console.log(`⚠️ Manager not found in DB for: "${rawName}" (Assigned to ${user.personalDetails.firstName})`);
        }
      } else {
         console.log(`⚠️ Unrecognized manager name format: "${rawName}"`);
      }
    }

    console.log('\n--- HIERARCHY LINKING COMPLETE ---');
    console.log(`Successfully Linked: ${successCount}`);
    console.log(`Could not find managers for: ${missingCount}`);
    console.log('You can now close this script (Ctrl+C).');
    process.exit();

  } catch (error) {
    console.error('Error during linking:', error);
    process.exit(1);
  }
}

// Run the function
establishHierarchy();