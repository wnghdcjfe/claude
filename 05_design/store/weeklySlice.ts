import { StateCreator } from 'zustand';
import { WeeklyPlan } from '@/types';

export interface WeeklySlice {
  weeklyPlans: WeeklyPlan[];
  currentWeeklyPlan: WeeklyPlan | null;
  weeklyLoading: boolean;
  fetchWeeklyPlans: () => Promise<void>;
  fetchWeeklyPlan: (id: string) => Promise<void>;
  addWeeklyPlan: (plan: Partial<WeeklyPlan>) => Promise<WeeklyPlan>;
  updateWeeklyPlan: (id: string, data: Partial<WeeklyPlan>) => Promise<void>;
  deleteWeeklyPlan: (id: string) => Promise<void>;
  toggleWeeklyGoal: (id: string, index: number) => Promise<void>;
}

export const createWeeklySlice: StateCreator<WeeklySlice> = (set) => ({
  weeklyPlans: [],
  currentWeeklyPlan: null,
  weeklyLoading: false,
  fetchWeeklyPlans: async () => {
    set({ weeklyLoading: true });
    const res = await fetch('/api/weekly');
    const data = await res.json();
    set({ weeklyPlans: data, weeklyLoading: false });
  },
  fetchWeeklyPlan: async (id) => {
    const res = await fetch(`/api/weekly/${id}`);
    const data = await res.json();
    set({ currentWeeklyPlan: data });
  },
  addWeeklyPlan: async (plan) => {
    const res = await fetch('/api/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    set((state) => ({ weeklyPlans: [...state.weeklyPlans, data] }));
    return data;
  },
  updateWeeklyPlan: async (id, data) => {
    const res = await fetch(`/api/weekly/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    set((state) => ({
      weeklyPlans: state.weeklyPlans.map((p) => (p._id === id ? updated : p)),
      currentWeeklyPlan: state.currentWeeklyPlan?._id === id ? updated : state.currentWeeklyPlan,
    }));
  },
  deleteWeeklyPlan: async (id) => {
    await fetch(`/api/weekly/${id}`, { method: 'DELETE' });
    set((state) => ({
      weeklyPlans: state.weeklyPlans.filter((p) => p._id !== id),
      currentWeeklyPlan: state.currentWeeklyPlan?._id === id ? null : state.currentWeeklyPlan,
    }));
  },
  toggleWeeklyGoal: async (id, index) => {
    const res = await fetch(`/api/weekly/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalIndex: index }),
    });
    const updated = await res.json();
    set((state) => ({
      weeklyPlans: state.weeklyPlans.map((p) => (p._id === id ? updated : p)),
      currentWeeklyPlan: state.currentWeeklyPlan?._id === id ? updated : state.currentWeeklyPlan,
    }));
  },
});
