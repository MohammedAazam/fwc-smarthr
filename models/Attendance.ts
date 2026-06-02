import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  status: 'present' | 'absent' | 'late' | 'wfh' | 'holiday';
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'wfh', 'holiday'],
      required: true,
      default: 'present',
    },
  },
  { timestamps: true }
);

// Compounded index for quick user-date queries, and single index on date for reports
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;
