import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'senior_manager' | 'hr_recruiter' | 'employee';
  department: string;
  designation: string;
  managerId: mongoose.Types.ObjectId | null;
  joiningDate: Date;
  phone?: string;
  photoUrl?: string;
  isActive: boolean;
  basicSalary: number;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'senior_manager', 'hr_recruiter', 'employee'],
      required: true,
      default: 'employee',
    },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    joiningDate: { type: Date, required: true, default: Date.now },
    phone: { type: String },
    photoUrl: { type: String },
    isActive: { type: Boolean, required: true, default: true },
    basicSalary: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Indexes for scalability
UserSchema.index({ email: 1 });
UserSchema.index({ department: 1 });
UserSchema.index({ managerId: 1 });
UserSchema.index({ role: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
