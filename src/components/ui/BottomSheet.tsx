'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setDragY(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 120) {
      triggerHaptic(15);
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={() => {
          triggerHaptic(10);
          onClose();
        }}
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative w-full max-h-[90vh] lg:max-h-[85vh] lg:max-w-xl bg-slate-900 border-t lg:border border-slate-800 rounded-t-3xl lg:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up z-10"
      >
        {/* Mobile Swipe Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <button
            onClick={() => {
              triggerHaptic(10);
              onClose();
            }}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
