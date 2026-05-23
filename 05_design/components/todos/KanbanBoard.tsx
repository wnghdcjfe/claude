'use client';
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useStore } from '@/store';
import { Todo, TodoStatus } from '@/types';
import KanbanColumn from './KanbanColumn';
import TodoCard from './TodoCard';

const STATUSES: TodoStatus[] = ['todo', 'doing', 'done'];

interface KanbanBoardProps {
  onEdit: (todo: Todo) => void;
}

export default function KanbanBoard({ onEdit }: KanbanBoardProps) {
  const { todos, reorderTodo, deleteTodo } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeTodo = activeId ? todos.find((t) => t._id === activeId) : null;

  const todosByStatus = (status: TodoStatus) =>
    todos.filter((t) => t.status === status).sort((a, b) => (a.order < b.order ? -1 : 1));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTodo = todos.find((t) => t._id === activeId);
    if (!activeTodo) return;

    const overTodo = todos.find((t) => t._id === overId);
    let newStatus: TodoStatus = activeTodo.status;
    if (STATUSES.includes(overId as TodoStatus)) {
      newStatus = overId as TodoStatus;
    } else if (overTodo) {
      newStatus = overTodo.status;
    }

    const columnTodos = todos
      .filter((t) => t.status === newStatus && t._id !== activeId)
      .sort((a, b) => (a.order < b.order ? -1 : 1));

    let prevOrder: string | null = null;
    let nextOrder: string | null = null;

    if (overTodo && overTodo._id !== activeId) {
      const idx = columnTodos.findIndex((t) => t._id === overId);
      prevOrder = idx > 0 ? columnTodos[idx - 1].order : null;
      nextOrder = columnTodos[idx]?.order ?? null;
    } else {
      prevOrder = columnTodos.length > 0 ? columnTodos[columnTodos.length - 1].order : null;
    }

    reorderTodo(activeId, newStatus, prevOrder, nextOrder);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 할 일을 삭제하시겠습니까?')) deleteTodo(id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            todos={todosByStatus(status)}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTodo && (
          <TodoCard
            todo={activeTodo}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
