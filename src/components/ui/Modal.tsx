'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  /** max-w class, e.g. 'max-w-md' (default) or 'max-w-lg' */
  maxWidth?: string;
  /** Extra classes applied to the card panel */
  className?: string;
  /** When true the card grows to fill most of the viewport height (useful for sheets) */
  fullHeight?: boolean;
  /** Hides the default close (×) button */
  hideCloseButton?: boolean;
  children: React.ReactNode;
}

/**
 * Shared modal primitive.
 * - Renders via React portal so the backdrop always covers the full viewport.
 * - Traps focus inside and closes on Escape.
 * - Dark, blurred full-screen backdrop.
 * - MD3 / Tonal-Velocity styled card.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  maxWidth = 'max-w-md',
  className = '',
  fullHeight = false,
  hideCloseButton = false,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px] animate-fade-in" />

      {/* Card */}
      <div
        ref={panelRef}
        className={[
          'relative w-full bg-surface-container-lowest rounded-[28px] shadow-2xl overflow-hidden animate-fade-in',
          maxWidth,
          fullHeight ? 'max-h-[90vh] overflow-y-auto' : '',
          className,
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
