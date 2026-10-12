import mongoose from 'mongoose';
import { ALL_PERMISSIONS, ROLES } from '../utils/permissions.js';

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: Object.values(ROLES).filter((role) => role !== ROLES.Boss),
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      enum: ALL_PERMISSIONS,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const RolePermission = mongoose.model(
  'RolePermission',
  rolePermissionSchema,
);

export default RolePermission;
