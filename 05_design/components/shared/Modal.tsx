'use client';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        className="relative w-full max-w-md p-6 overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow:
            'rgba(0,0,0,0.02) 0 0 0 1px, rgba(0,0,0,0.04) 0 2px 6px 0, rgba(0,0,0,0.1) 0 4px 8px 0',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: '#222222' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-xl leading-none transition-colors"
            style={{ color: '#6a6a6a' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#222222')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6a6a6a')}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
