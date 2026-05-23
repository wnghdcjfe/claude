'use client';
import { useState } from 'react';
import { Goal } from '@/types';

interface GoalFormProps {
  initial?: Partial<Goal>;
  onSubmit: (data: { title: string; description: string }) => void;
  onCancel: () => void;
}

export default function GoalForm({ initial, onSubmit, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6a6a6a' }}>
          목표 제목{' '}
          <span style={{ color: '#c13515' }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="1년 목표를 입력하세요"
          required
          className="ab-input"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#6a6a6a' }}>
          설명 <span className="font-normal" style={{ color: '#929292' }}>(선택)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="목표에 대한 설명을 입력하세요"
          rows={3}
          className="ab-input"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">
          취소
        </button>
        <button type="submit" className="btn-rausch">
          저장
        </button>
      </div>
    </form>
  );
}
