import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import {
  getDefaultPermissionsForRole,
  normalizePermissions,
  ROLES,
} from '../utils/permissions.js';

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
      default: ROLES.User,
    },

    permissions: {
      type: [String],
      default: function getPermissions() {
        return getDefaultPermissionsForRole(this.role);
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
  try {
    if (
      (this.isModified('role') || this.isNew) &&
      !this.isModified('permissions')
    ) {
      this.permissions = getDefaultPermissionsForRole(this.role);
    }

    if (this.isModified('permissions')) {
      this.permissions = normalizePermissions(this.permissions);
    }

    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(
  candidatePassword,
) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;