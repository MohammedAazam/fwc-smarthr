import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayroll extends Document {
  userId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  basic: number;
  hra: number;
  da: number;
  deductions: number;
  tds: number;
  netSalary: number;
  generatedAt: Date;
}

const PayrollSchema: Schema<IPayroll> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    basic: { type: Number, required: true },
    hra: { type: Number, required: true },
    da: { type: Number, required: true },
    deductions: { type: Number, required: true, default: 0 },
    tds: { type: Number, required: true },
    netSalary: { type: Number, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness for a given user per month/year
PayrollSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });
PayrollSchema.index({ month: 1, year: 1 });

const Payroll: Model<IPayroll> =
  mongoose.models.Payroll || mongoose.model<IPayroll>('Payroll', PayrollSchema);

export default Payroll;
