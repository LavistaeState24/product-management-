import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ROLE_PERMISSIONS, ROLES } from '../utils/permissions.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      default: ROLES.Staff,
    },
    permissions: {
      type: [String],
      default: function getPermissions() {
        return ROLE_PERMISSIONS[this.role] || [];
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function syncRolePermissions(next) {
  if (this.isModified('role') || this.isNew) {
    this.permissions = ROLE_PERMISSIONS[this.role] || [];
  }

  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
