import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILeave extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'casual' | 'sick' | 'earned' | 'unpaid';
  from: Date;
  to: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId | null;
  comment?: string;
}

const LeaveSchema: Schema<ILeave> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['casual', 'sick', 'earned', 'unpaid'],
      required: true,
    },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    comment: { type: String },
  },
  { timestamps: true }
);

// Indexes
LeaveSchema.index({ userId: 1 });
LeaveSchema.index({ status: 1 });
LeaveSchema.index({ from: 1, to: 1 });

const Leave: Model<ILeave> = mongoose.models.Leave || mongoose.model<ILeave>('Leave', LeaveSchema);

export default Leave;
