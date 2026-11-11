const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin', 'player'], default: 'player' },
  avatar:   { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  // Forgot-password: only a SHA-256 hash of the emailed token is stored.
  // select: false keeps both out of every normal query.
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

// ✅ async without next
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);