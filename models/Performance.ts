import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoal {
  title: string;
  target: number; // Target percentage or metric
  achieved: number; // Achieved percentage or metric
  score: number; // Calculated score or rating for this goal (1-5 or 0-100)
}

export interface IPerformance extends Document {
  userId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  period: string; // e.g., "Q1 2026", "2026 Annual"
  goals: IGoal[];
  overallRating: number; // e.g., 1 to 5
  aiGeneratedReview?: string;
  submittedAt: Date;
}

const GoalSchema = new Schema<IGoal>({
  title: { type: String, required: true },
  target: { type: Number, required: true, default: 100 },
  achieved: { type: Number, required: true, default: 0 },
  score: { type: Number, required: true, default: 0 },
});

const PerformanceSchema: Schema<IPerformance> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true },
    goals: [GoalSchema],
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    aiGeneratedReview: { type: String },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
PerformanceSchema.index({ userId: 1 });
PerformanceSchema.index({ period: 1 });

const Performance: Model<IPerformance> =
  mongoose.models.Performance || mongoose.model<IPerformance>('Performance', PerformanceSchema);

export default Performance;
