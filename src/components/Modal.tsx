'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    md: 'max-w-[520px]',
    lg: 'max-w-[768px]',
    xl: 'max-w-[1024px]'
  }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div 
        ref={modalRef}
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col 
          transform transition-all animate-scale-in border border-white/40 overflow-hidden
        `}
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white z-10 sticky top-0 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="group p-2 rounded-full hover:bg-slate-100 transition-all duration-200 outline-none focus:ring-2 focus:ring-slate-200"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};
