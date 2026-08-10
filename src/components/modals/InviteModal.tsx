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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-[28px] p-6 shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-highest transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Share2 className="w-7 h-7" />
          </div>
          <h2 className="text-[24px] leading-tight font-medium text-on-surface tracking-tight mb-1">Invite Members</h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Share this link to invite friends to <span className="font-bold text-primary">{group.name}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ml-1">
              Invite Link
            </label>
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline/20 rounded-2xl p-2 pl-4">
              <LinkIcon className="w-4 h-4 text-on-surface-variant shrink-0" />
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="bg-transparent flex-1 text-sm text-on-surface font-medium outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container border border-outline/10 text-center">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Invite Code</p>
            <p className="text-lg font-mono font-medium text-primary tracking-wider">
              {inviteCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
