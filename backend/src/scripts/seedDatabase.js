require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const User = require('../models/User');

// Helper to determine Roles
function determineRole(jobTitle, employeeId) {
  if (!jobTitle) return 'EMPLOYEE';
  const title = jobTitle.toLowerCase();
  if (employeeId === '128') return 'CEO';
  if (title.includes('hr manager') || title.includes('human resource')) return 'HR_ADMIN';
  if (title.includes('ict manager')) return 'ICT_ADMIN';
  if (title.includes('manager') || title.includes('supervisor') || title.includes('officer in charge')) return 'MANAGER';
  return 'EMPLOYEE';
}

async function runSeeder() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Atlas Connected!');

    await User.deleteMany({});
    console.log('🗑️ Cleared existing database records.');

    const usersToInsert = [];

    console.log('⏳ Reading CSV...');
    await new Promise((resolve, reject) => {
      fs.createReadStream('./data/Employee Listing.csv')
        .pipe(csv())
        .on('data', (row) => {
          const employeeId = row['Employee ID'] ? row['Employee ID'].trim() : null;
          if (!employeeId) return;

          const rawDate = row['Last Hire Date'];
          let hireDate = new Date(); // Default to today

          // ✨ THE FIX: Correctly parse DD-MM-YYYY dates from the CSV
          if (rawDate && rawDate.trim() !== '') {
            const dateStr = rawDate.trim();
            const parts = dateStr.split('-');
            
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
              const year = parseInt(parts[2], 10);
              
              const parsedDate = new Date(year, month, day);
              if (!isNaN(parsedDate.valueOf())) {
                hireDate = parsedDate;
              }
            }
          }
          const hiringYear = hireDate.getFullYear();

          usersToInsert.push(new User({
            employeeId: employeeId,
            companyCode: row['Company Code'] ? row['Company Code'].trim() : 'FSM',
            username: `${employeeId}${hiringYear}`,
            password: `STIP+${employeeId}`, // Will be hashed automatically
            personalDetails: {
              firstName: row['First Name'] ? row['First Name'].trim() : '',
              lastName: row['Last Name'] ? row['Last Name'].trim() : ''
            },
            employmentDetails: {
              jobTitle: row['Job Title'] ? row['Job Title'].trim() : '',
              dateOfHire: hireDate,
              prorateValue: parseFloat(row['Prorate Value'] || 12),
              rawManagerName: row['Manager Name'] ? row['Manager Name'].trim() : null
            },
            security: {
              role: determineRole(row['Job Title'], employeeId)
            }
          }));
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`⏳ Saving ${usersToInsert.length} staff to database...`);
    for (const user of usersToInsert) {
      await user.save();
    }
    console.log('✅ All staff inserted successfully!');

    console.log('⏳ Linking staff to their managers...');
    const allUsers = await User.find({ 'employmentDetails.rawManagerName': { $ne: null } });
    
    let linkedCount = 0;
    for (const user of allUsers) {
      const rawName = user.employmentDetails.rawManagerName;
      const nameParts = rawName.split(',');
      
      if (nameParts.length === 2) {
        const lastName = nameParts[0].trim();
        const fullFirstName = nameParts[1].trim();
        const firstName = fullFirstName.split(' ')[0];

        let manager = await User.findOne({
          'personalDetails.lastName': new RegExp(`^${lastName}$`, 'i'),
          'personalDetails.firstName': new RegExp(`^${firstName}`, 'i'),
          'security.role': { $ne: 'EMPLOYEE' } 
        });

        if (!manager) {
          manager = await User.findOne({
            'personalDetails.lastName': new RegExp(`^${lastName}$`, 'i'),
            'personalDetails.firstName': new RegExp(`^${firstName}`, 'i')
          });
        }

        if (manager) {
          user.employmentDetails.reportingTo = manager._id;
          user.employmentDetails.rawManagerName = undefined; 
          await user.save();
          linkedCount++;
        } else {
          console.log(`⚠️ Skip: "${user.personalDetails.firstName} ${user.personalDetails.lastName}" - Could not find manager named "${firstName} ${lastName}"`);
        }
      }
    }
    console.log(`✅ Successfully linked ${linkedCount} employees to their managers!`);
    console.log('🚀 SEEDING COMPLETE! You can close this script.');
    process.exit();

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

runSeeder();