import mongoose, { Schema, Document } from 'mongoose';

interface WeeklyGoal {
  text: string;
  done: boolean;
}

export interface IWeeklyPlan extends Document {
  userId: mongoose.Types.ObjectId;
  weekStart: Date;
  goals: WeeklyGoal[];
  memo: string;
  retrospective: string;
  goalId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyGoalSchema = new Schema<WeeklyGoal>(
  { text: { type: String, required: true }, done: { type: Boolean, default: false } },
  { _id: false }
);

const WeeklyPlanSchema = new Schema<IWeeklyPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    weekStart: { type: Date, required: true },
    goals: { type: [WeeklyGoalSchema], default: [] },
    memo: { type: String, default: '' },
    retrospective: { type: String, default: '' },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
  },
  { timestamps: true }
);

WeeklyPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export default mongoose.models.WeeklyPlan || mongoose.model<IWeeklyPlan>('WeeklyPlan', WeeklyPlanSchema);
