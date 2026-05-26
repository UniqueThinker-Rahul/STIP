require('dotenv').config(); // This loads your .env file
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB Atlas using the URI from the .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Atlas Connected!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ... rest of the file stays exactly the same

const usersToInsert = [];

// Read the Employee Listing CSV
fs.createReadStream('./data/Employee Listing.csv')
  .pipe(csv())
  .on('data', (row) => {
    // 1. Extract core data
    const employeeId = row['Employee ID'] ? row['Employee ID'].trim() : null;
    const companyCode = row['Company Code'] ? row['Company Code'].trim() : 'FSM';
    
    // Skip empty rows
    if (!employeeId) return; 

    // 2. Parse Date of Hire to get the Hiring Year
    const rawDate = row['Last Hire Date'];
    let hireDate = new Date();
    let hiringYear = new Date().getFullYear();
    
    if (rawDate) {
      hireDate = new Date(rawDate);
      hiringYear = hireDate.getFullYear();
    }

    // 3. APPLY YOUR LOGIC: Username and Password
    const username = `${employeeId}${hiringYear}`; // e.g., 3642022
    const defaultPassword = `STIP+${employeeId}`;  // e.g., STIP+364

    // 4. Clean up Manager Name (remove extra spaces)
    let rawManagerName = row['Manager Name'] ? row['Manager Name'].trim() : null;

    // 5. Build User Object
    usersToInsert.push({
      employeeId: employeeId,
      companyCode: companyCode,
      username: username,
      password: defaultPassword, // Mongoose will automatically hash this via pre-save!
      personalDetails: {
        firstName: row['First Name'] ? row['First Name'].trim() : '',
        lastName: row['Last Name'] ? row['Last Name'].trim() : '',
      },
      employmentDetails: {
        jobTitle: row['Job Title'] ? row['Job Title'].trim() : '',
        dateOfHire: hireDate,
        prorateValue: parseFloat(row['Prorate Value'] || 12),
        rawManagerName: rawManagerName,
        isActive: true
      },
      security: {
        role: determineRole(row['Job Title'], employeeId), // Helper function below
        isFirstLogin: true
      }
    });
  })
  .on('end', async () => {
    console.log(`CSV Parsed. Found ${usersToInsert.length} staff members.`);
    await processAndSaveUsers(usersToInsert);
  });

// Helper Function: Assign roles based on Job Title / ID
function determineRole(jobTitle, employeeId) {
  if (!jobTitle) return 'EMPLOYEE';
  const title = jobTitle.toLowerCase();
  
  if (employeeId === '128') return 'CEO'; // CEO Jared Morris
  if (title.includes('hr manager') || title.includes('human resource')) return 'HR_ADMIN';
  if (title.includes('ict manager')) return 'ICT_ADMIN';
  if (title.includes('manager') || title.includes('supervisor') || title.includes('officer in charge')) return 'MANAGER';
  
  return 'EMPLOYEE';
}

// Save Users to Database sequentially
async function processAndSaveUsers(users) {
  for (let userData of users) {
    try {
      // Check if user already exists
      const exists = await User.findOne({ employeeId: userData.employeeId });
      if (!exists) {
        const newUser = new User(userData);
        await newUser.save(); // This triggers the bcrypt password hashing
        console.log(`✅ Inserted: ${userData.username} (${userData.personalDetails.firstName})`);
      }
    } catch (error) {
      console.error(`❌ Error inserting ${userData.username}:`, error.message);
    }
  }
  
  console.log('\n--- Step 1 Complete ---');
  console.log('Next step: Run the manager linking function.');
  process.exit();
}