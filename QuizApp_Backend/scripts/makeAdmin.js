// Promote an existing account to admin: npm run make-admin -- you@example.com
// Use it once for the first admin; after that, promote people from the admin console.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../Config/db');
const User = require('../Models/Users');

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run make-admin -- <email>');
    process.exit(1);
  }
  await connectDB();
  const user = await User.findOneAndUpdate({ email }, { role: 'admin', isActive: true }, { returnDocument: 'after' });
  if (!user) {
    console.error(`No account found for ${email}. Register it in the app first.`);
  } else {
    console.log(`${user.name} <${user.email}> is now an admin. Sign out and back in to see the console.`);
  }
  await mongoose.disconnect();
  process.exit(user ? 0 : 1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
