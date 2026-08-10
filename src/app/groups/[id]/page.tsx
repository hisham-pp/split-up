'use client';

import React, { useEffect, useState, use } from 'react';
import { useDispatch } from 'react-redux';
import { db, LocalGroup } from '@/lib/db/db';
import { setActiveGroup } from '@/store/slices/uiSlice';
import { GroupDetailView } from '@/views/GroupDetailView';
import { AlertCircle } from 'lucide-react';

interface GroupDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupDetailPage({ params }: GroupDetailPageProps) {
  const dispatch = useDispatch();
  const unwrappedParams = use(params);
  const groupId = unwrappedParams.id;

  const [group, setGroup] = useState<LocalGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadGroup() {
      try {
        const found = await db.groups.get(groupId);
        if (found) {
          setGroup(found);
          dispatch(setActiveGroup(found as any));
        } else {
          setError('Group not found.');
        }
      } catch (err) {
        setError('Failed to load group.');
      } finally {
        setLoading(false);
      }
    }

    loadGroup();

    // Cleanup active group on unmount
    return () => {
      dispatch(setActiveGroup(null));
    };
  }, [groupId, dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="text-center p-8 bg-error-container/20 border border-error-container rounded-3xl max-w-md mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h1 className="text-lg font-bold mb-2">Error</h1>
        <p className="text-sm text-on-surface-variant font-medium">{error || 'Group not found.'}</p>
      </div>
    );
  }

  return <GroupDetailView group={group} />;
}
