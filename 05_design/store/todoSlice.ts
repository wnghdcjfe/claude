import { StateCreator } from 'zustand';
import { Todo, TodoStatus, WeeklyPlan } from '@/types';
import { getKeyBetween, getKeyAtEnd } from '@/lib/fractionalIndex';

export interface TodoSlice {
  todos: Todo[];
  todosLoading: boolean;
  fetchTodos: (filters?: { status?: string; weeklyPlanId?: string; goalId?: string }) => Promise<void>;
  addTodo: (todo: Partial<Todo>) => Promise<void>;
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  reorderTodo: (id: string, newStatus: TodoStatus, prevOrder: string | null, nextOrder: string | null) => Promise<void>;
}

type WeeklyStateLike = {
  weeklyPlans: WeeklyPlan[];
  currentWeeklyPlan: WeeklyPlan | null;
};

async function refreshWeeklyPlan(
  weeklyPlanId: string | undefined,
  set: (partial: Partial<WeeklyStateLike>) => void,
  getState: () => WeeklyStateLike
): Promise<void> {
  if (!weeklyPlanId) return;
  const res = await fetch(`/api/weekly/${weeklyPlanId}`);
  if (!res.ok) return;
  const updated: WeeklyPlan = await res.json();
  const state = getState();
  set({
    weeklyPlans: state.weeklyPlans.map((p) => (p._id === weeklyPlanId ? updated : p)),
    currentWeeklyPlan:
      state.currentWeeklyPlan?._id === weeklyPlanId ? updated : state.currentWeeklyPlan,
  });
}

export const createTodoSlice: StateCreator<TodoSlice> = (set, get) => ({
  todos: [],
  todosLoading: false,
  fetchTodos: async (filters) => {
    set({ todosLoading: true });
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.weeklyPlanId) params.set('weeklyPlanId', filters.weeklyPlanId);
    if (filters?.goalId) params.set('goalId', filters.goalId);
    const res = await fetch(`/api/todos?${params}`);
    const data = await res.json();
    set({ todos: data, todosLoading: false });
  },
  addTodo: async (todo) => {
    const todos = get().todos;
    const lastOrder = todos.length > 0 ? todos[todos.length - 1].order : null;
    const order = getKeyAtEnd(lastOrder);
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...todo, order }),
    });
    const data: Todo = await res.json();
    set((state) => ({ todos: [...state.todos, data] }));
    await refreshWeeklyPlan(
      data.weeklyPlanId,
      (partial) => set(partial as never),
      () => get() as unknown as WeeklyStateLike
    );
  },
  updateTodo: async (id, data) => {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated: Todo = await res.json();
    set((state) => ({ todos: state.todos.map((t) => (t._id === id ? updated : t)) }));
    await refreshWeeklyPlan(
      updated.weeklyPlanId,
      (partial) => set(partial as never),
      () => get() as unknown as WeeklyStateLike
    );
  },
  deleteTodo: async (id) => {
    const previous = get().todos.find((t) => t._id === id);
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    set((state) => ({ todos: state.todos.filter((t) => t._id !== id) }));
    await refreshWeeklyPlan(
      previous?.weeklyPlanId,
      (partial) => set(partial as never),
      () => get() as unknown as WeeklyStateLike
    );
  },
  reorderTodo: async (id, newStatus, prevOrder, nextOrder) => {
    const previous = get().todos.find((t) => t._id === id);
    if (!previous) return;
    const newOrder = getKeyBetween(prevOrder, nextOrder);
    set((state) => ({
      todos: state.todos.map((t) => (t._id === id ? { ...t, status: newStatus, order: newOrder } : t)),
    }));
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, order: newOrder }),
      });
      if (!res.ok) throw new Error('PATCH failed');
      await refreshWeeklyPlan(
        previous.weeklyPlanId,
        (partial) => set(partial as never),
        () => get() as unknown as WeeklyStateLike
      );
    } catch {
      set((state) => ({
        todos: state.todos.map((t) =>
          t._id === id ? { ...t, status: previous.status, order: previous.order } : t
        ),
      }));
    }
  },
});
