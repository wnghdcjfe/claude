export interface Goal {
  _id: string;
  title: string;
  description: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyGoal {
  text: string;
  done: boolean;
}

export interface WeeklyPlan {
  _id: string;
  weekStart: string;
  goals: WeeklyGoal[];
  memo: string;
  retrospective: string;
  goalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TodoStatus = 'todo' | 'doing' | 'done';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate?: string;
  dayOfWeek?: number;
  order: string;
  weeklyPlanId?: string;
  weeklyGoalIndex?: number;
  goalId?: string;
  createdAt: string;
  updatedAt: string;
}
