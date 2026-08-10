'use client';

import React, { useState } from 'react';
import { LocalGroup } from '@/lib/db/db';
import { X, Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: LocalGroup;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, group }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const inviteCode = `SPLITUP_${group.id.toUpperCase()}_INVITE`;
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : `https://splitup.app/join/${inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Invite Members</h2>
          <p className="text-xs text-slate-400 mt-1">
            Share this link to invite friends to <span className="font-semibold text-indigo-300">{group.name}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Invite Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2">
              <LinkIcon className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="bg-transparent flex-1 text-xs text-slate-200 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">Invite Code</p>
            <p className="text-base font-mono font-bold text-indigo-400 mt-0.5 tracking-wider">
              {inviteCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
