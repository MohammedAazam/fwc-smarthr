import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICandidate extends Document {
  jobId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  resumeUrl?: string;
  aiScore?: number; // 0 to 100
  aiMatchReason?: string;
  stage: 'applied' | 'screened' | 'interview' | 'offer' | 'hired' | 'rejected';
  interviewNotes?: string;
  aiRecommendation?: string;
}

const CandidateSchema: Schema<ICandidate> = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    resumeUrl: { type: String },
    aiScore: { type: Number, default: 0 },
    aiMatchReason: { type: String },
    stage: {
      type: String,
      enum: ['applied', 'screened', 'interview', 'offer', 'hired', 'rejected'],
      required: true,
      default: 'applied',
    },
    interviewNotes: { type: String, default: '' },
    aiRecommendation: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for candidate ranking and pipelines
CandidateSchema.index({ jobId: 1 });
CandidateSchema.index({ stage: 1 });
CandidateSchema.index({ aiScore: -1 });

const Candidate: Model<ICandidate> =
  mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);

export default Candidate;
