const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // 1. Check if Abhishek exists as a User
  const User = mongoose.model('User', new mongoose.Schema({
    name: String, email: String, passwordHash: String, role: String
  }, { timestamps: true }));

  const users = await User.find({ name: /abhishek/i }).lean();
  console.log('=== USERS matching "abhishek" ===');
  if (users.length === 0) {
    console.log('❌ No user found with name "abhishek"');
  } else {
    users.forEach(u => console.log(`✅ Found: name=${u.name}, email=${u.email}, role=${u.role}, _id=${u._id}`));
  }

  // 2. Check ALL farms in DB
  const Farm = mongoose.model('Farm', new mongoose.Schema({}, { strict: false }));
  const farms = await Farm.find().lean();
  console.log(`\n=== ALL FARMS in MongoDB (${farms.length} total) ===`);
  if (farms.length === 0) {
    console.log('❌ No farms found in database at all!');
  } else {
    farms.forEach(f => console.log(`  - farm_id=${f.farm_id}, farm_name=${f.farm_name}, farmer_id=${f.farmer_id}, crop=${f.crop}`));
  }

  // 3. Check ALL users in DB
  const allUsers = await User.find().lean();
  console.log(`\n=== ALL USERS in MongoDB (${allUsers.length} total) ===`);
  allUsers.forEach(u => console.log(`  - name=${u.name}, email=${u.email}, role=${u.role}`));

  await mongoose.disconnect();
  console.log('\n✅ Done');
}

diagnose().catch(e => { console.error(e); process.exit(1); });
