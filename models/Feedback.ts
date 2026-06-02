import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  responses: string[]; // text answers to survey questions
  sentimentScore?: number; // HuggingFace raw probability (0 to 1)
  sentimentLabel?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; // HF label
}

const FeedbackSchema: Schema<IFeedback> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    responses: { type: [String], required: true, default: [] },
    sentimentScore: { type: Number },
    sentimentLabel: {
      type: String,
      enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
      default: 'NEUTRAL',
    },
  },
  { timestamps: true }
);

// Indexes
FeedbackSchema.index({ userId: 1 });
FeedbackSchema.index({ month: 1, year: 1 });

const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
