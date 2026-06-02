import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJob extends Document {
  title: string;
  department: string;
  description: string;
  requirements: string[];
  postedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const JobSchema: Schema<IJob> = new Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    description: { type: String, required: true },
    requirements: { type: [String], required: true, default: [] },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, required: true, default: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
JobSchema.index({ isActive: 1 });
JobSchema.index({ department: 1 });

const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
