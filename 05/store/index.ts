import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { GoalSlice, createGoalSlice } from './goalSlice';
import { WeeklySlice, createWeeklySlice } from './weeklySlice';
import { TodoSlice, createTodoSlice } from './todoSlice';

type AppStore = GoalSlice & WeeklySlice & TodoSlice;

export const useStore = create<AppStore>()(
  devtools(
    (...a) => ({
      ...createGoalSlice(...a),
      ...createWeeklySlice(...a),
      ...createTodoSlice(...a),
    }),
    { name: 'AppStore' }
  )
);
