const dotenv = require('dotenv');
dotenv.config();
const { connectToDatabase } = require('./src/utils/db');
const { User } = require('./src/models/User');

async function main() {
  await connectToDatabase();
  const res = await User.updateMany({ role: 'officer' }, { $set: { isVerified: true } });
  console.log('Updated officers:', res);
  const officers = await User.find({ role: 'officer' });
  console.log('Officers in DB:', officers.map(o => ({ email: o.email, role: o.role, isVerified: o.isVerified })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
