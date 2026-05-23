import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  dayOfWeek?: number;
  order: string;
  weeklyPlanId?: mongoose.Types.ObjectId;
  weeklyGoalIndex?: number;
  goalId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    dueDate: { type: Date },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    order: { type: String, required: true },
    weeklyPlanId: { type: Schema.Types.ObjectId, ref: 'WeeklyPlan' },
    weeklyGoalIndex: { type: Number, min: 0 },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
  },
  { timestamps: true }
);

TodoSchema.index({ userId: 1, status: 1, order: 1 });

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
