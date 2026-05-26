require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // <-- ADD THIS
const User = require('./models/User'); 

const managers = [
  { ln: "Adolph", fn: "Johnny", id: "2552014" },
  { ln: "Aliven", fn: "Dino", id: "4392025" },
  { ln: "Anson", fn: "Peterson", id: "2712018" },
  { ln: "Bulabalavu", fn: "Lesivou", id: "4452025" },
  { ln: "Eperiam", fn: "Emerald J.", id: "1672011" },
  { ln: "Garsain", fn: "Garry D.", id: "2492016" },
  { ln: "Halstead", fn: "Neil", id: "3822015" },
  { ln: "Helgenberger", fn: "Tracy-Anne", id: "3742022" },
  { ln: "Isaac", fn: "Hannah Marie L.", id: "2552017" },
  { ln: "Jonah", fn: "Andon J.", id: "1032009" },
  { ln: "Killion", fn: "Redley Jr.", id: "1862014" },
  { ln: "Masaichy", fn: "Wilton", id: "2362016" },
  { ln: "Mendiola", fn: "Cherish A.", id: "1782013" },
  { ln: "Morris", fn: "Jared C.", id: "1282008" },
  { ln: "Narruhn", fn: "Wayne S.", id: "1332008" },
  { ln: "Ramon", fn: "Maderson K.", id: "0062016" },
  { ln: "Rumwol", fn: "John JR", id: "1172009" },
  { ln: "Saheem", fn: "Abdul", id: "2762018" },
  { ln: "Saimon", fn: "Joseph M.", id: "2852018" },
  { ln: "Sharma", fn: "Francis R.", id: "2672017" },
  { ln: "Siba", fn: "Gibson T.", id: "2382016" },
  { ln: "Sovau", fn: "Sireli", id: "6202020" },
  { ln: "Tamani", fn: "Savenaca", id: "2282015" },
  { ln: "Tom", fn: "Harbert", id: "1712012" }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas...');

    // Hash the password ONCE here before the loop
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('STIP@2026', salt);

    for (const m of managers) {
      await User.findOneAndUpdate(
        { username: m.id }, 
        {
          $set: {
            // unique identifiers
            employeeId: m.id,
            companyCode: 'FSM',
            // personal details
            username: m.id, 
            password: hashedPassword, // SAVE THE HASHED PASSWORD
            'personalDetails.firstName': m.fn,
            'personalDetails.lastName': m.ln,
            'employmentDetails.jobTitle': 'Line Manager',
            'security.role': 'MANAGER' 
          }
        },
        { upsert: true, returnDocument: 'after' } 
      );
      console.log(`✔️ Processed: ${m.fn} ${m.ln}`);
    }
    
    console.log('🎉 Passwords Hashed! All 24 Line Managers are ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding:', err);
    process.exit(1);
  }
}

seed();