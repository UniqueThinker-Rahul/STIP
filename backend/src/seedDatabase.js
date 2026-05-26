// backend/src/seedDatabase.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const User = require('./models/User'); 

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas...');

    const employees = [];
    const managerNamesSet = new Set();

    console.log('📄 Reading CSV file...');
    await new Promise((resolve, reject) => {
      fs.createReadStream('Employee & Manager list.csv')
        .pipe(csv())
        .on('data', (data) => {
          if (data['Employee ID']) {
            employees.push(data);
            if (data['Manager Name']) {
              managerNamesSet.add(data['Manager Name'].trim());
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const managerMap = {};
    for (const mName of managerNamesSet) {
      const parts = mName.split(' ');
      const first = parts[0].toLowerCase();
      const last = parts[parts.length - 1].toLowerCase();
      
      const match = employees.find(e => 
        e['First Name'].toLowerCase().includes(first) && 
        e['Last Name'].toLowerCase().includes(last)
      );
      
      if (match) managerMap[mName] = match['Employee ID'];
    }

    const managerIds = new Set(Object.values(managerMap));
    console.log(`🔍 Found ${employees.length} total staff. Identified ${managerIds.size} Line Managers.`);

    await User.deleteMany({});
    console.log('⏳ Pass 1: Creating secure user accounts...');
    const insertedUsers = {};

    for (const emp of employees) {
      const empId = Math.floor(emp['Employee ID']).toString();
      const dateParts = emp['Last Hire Date'].split('-');
      const hireYear = dateParts.length === 3 ? dateParts[2] : '2026';
      const hireDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);

      // 💡 DYNAMIC ROLE ASSIGNMENT: Checking the Job Title directly from the CSV!
      let role = managerIds.has(empId) ? 'MANAGER' : 'EMPLOYEE';
      const title = emp['Job Title'].trim().toLowerCase();
      
      if (title.includes('chief executive officer')) role = 'CEO';
      if (title.includes('human resouce') || title.includes('human resource')) role = 'HR_ADMIN';
      if (title.includes('ict manager') || title.includes('ict admin')) role = 'ICT_ADMIN';

      const newUser = await User.create({
        employeeId: empId,
        companyCode: emp['Company Code'].trim() || 'FSM',
        username: `${empId}${hireYear}`,
        password: 'STIP@2026', 
        personalDetails: {
          firstName: emp['First Name'].trim(),
          lastName: emp['Last Name'].trim(),
        },
        employmentDetails: {
          jobTitle: emp['Job Title'].trim(),
          dateOfHire: hireDate,
          prorateValue: parseFloat(emp['Prorate Value']) || 12
        },
        security: { role: role, isFirstLogin: true }
      });

      insertedUsers[empId] = newUser._id; 
    }

    console.log('🔗 Pass 2: Linking staff to their Line Managers...');
    for (const emp of employees) {
      const empId = Math.floor(emp['Employee ID']).toString();
      const mName = emp['Manager Name'] ? emp['Manager Name'].trim() : null;
      
      if (mName && managerMap[mName]) {
        const mEmpId = managerMap[mName];
        const mObjectId = insertedUsers[mEmpId]; 
        
        if (mObjectId) {
          await User.findByIdAndUpdate(insertedUsers[empId], {
            $set: { 'employmentDetails.reportingTo': mObjectId }
          });
        }
      }
    }

    console.log('🎉 Database seeding perfectly complete! Job roles dynamically assigned.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error Seeding:', error);
    process.exit(1);
  }
}

seed();