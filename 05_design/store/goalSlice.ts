import { StateCreator } from 'zustand';
import { Goal } from '@/types';

export interface GoalSlice {
  goals: Goal[];
  goalsLoading: boolean;
  fetchGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, '_id' | 'progress' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const createGoalSlice: StateCreator<GoalSlice> = (set) => ({
  goals: [],
  goalsLoading: false,
  fetchGoals: async () => {
    set({ goalsLoading: true });
    const res = await fetch('/api/goals');
    const data = await res.json();
    set({ goals: data, goalsLoading: false });
  },
  addGoal: async (goal) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    const data = await res.json();
    set((state) => ({ goals: [...state.goals, data] }));
  },
  updateGoal: async (id, data) => {
    const res = await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    set((state) => ({ goals: state.goals.map((g) => (g._id === id ? updated : g)) }));
  },
  deleteGoal: async (id) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    set((state) => ({ goals: state.goals.filter((g) => g._id !== id) }));
  },
});
