import { db, SyncQueueItem, QueueOperation } from '../db/db';
import { supabase, isSupabaseConfigured } from '../supabase/supabase';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingQueueCount: number;
  lastSyncedAt: string | null;
}

let isSyncingProcessRunning = false;
const listeners: Array<(status: SyncStatus) => void> = [];

let lastSyncedTime: string | null = null;

export function subscribeSyncStatus(callback: (status: SyncStatus) => void) {
  listeners.push(callback);
  notifyStatus();
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

async function notifyStatus() {
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;
  const pendingCount = await db.syncQueue.where('status').equals('pending').count();
  const status: SyncStatus = {
    isOnline,
    isSyncing: isSyncingProcessRunning,
    pendingQueueCount: pendingCount,
    lastSyncedAt: lastSyncedTime,
  };

  listeners.forEach((listener) => listener(status));
}

/**
 * Adds an operation to the local Dexie mutation queue.
 */
export async function queueMutation(operation: QueueOperation, payload: any) {
  const queueItem: SyncQueueItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    operation,
    payload,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  };

  await db.syncQueue.put(queueItem);
  notifyStatus();

  // Try trigger sync immediately if online
  if (typeof window !== 'undefined' && navigator.onLine) {
    processSyncQueue();
  }
}

function sanitizeUuid(id?: string | null): string | null {
  if (!id) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return isUuid ? id : null;
}

/**
 * Main Sync Loop: Processes pending items in the offline queue and pulls server updates.
 */
export async function processSyncQueue() {
  if (isSyncingProcessRunning) return;
  if (typeof window !== 'undefined' && !navigator.onLine) {
    notifyStatus();
    return;
  }
  if (!isSupabaseConfigured || !supabase) {
    notifyStatus();
    return;
  }

  isSyncingProcessRunning = true;
  notifyStatus();

  try {
    // Reset any failed items so they get a fresh retry with sanitized payloads
    const failedItems = await db.syncQueue.where('status').equals('failed').toArray();
    for (const fItem of failedItems) {
      await db.syncQueue.update(fItem.id, { status: 'pending', retries: 0 });
    }

    const pendingItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('timestamp');

    for (const item of pendingItems) {
      try {
        await executeRemoteMutation(item);
        await db.syncQueue.delete(item.id);
      } catch (err: any) {
        console.error(`Sync error on operation ${item.operation}:`, err);
        const newRetries = item.retries + 1;
        if (newRetries >= 3) {
          await db.syncQueue.update(item.id, {
            status: 'failed',
            retries: newRetries,
            errorMessage: err.message || 'Unknown network/RLS error',
          });
        } else {
          await db.syncQueue.update(item.id, {
            retries: newRetries,
          });
        }
      }
    }

    // Pull Server Changes if Supabase is active
    await pullRemoteChanges();
    lastSyncedTime = new Date().toISOString();
  } catch (globalErr) {
    console.error('Failed to execute sync loop:', globalErr);
  } finally {
    isSyncingProcessRunning = false;
    notifyStatus();
  }
}

/**
 * Executes a single mutation against Supabase PostgreSQL database.
 */
async function executeRemoteMutation(item: SyncQueueItem) {
  if (!supabase) return;

  const { operation, payload } = item;

  switch (operation) {
    case 'CREATE_GROUP': {
      const { error } = await supabase.from('groups').upsert({
        id: payload.id,
        name: payload.name,
        category: payload.category,
        cover_image: payload.coverImage,
        created_by: sanitizeUuid(payload.createdBy),
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      });
      if (error) throw error;
      break;
    }
    case 'UPDATE_GROUP': {
      const { error } = await supabase.from('groups').update({
        name: payload.name,
        category: payload.category,
        cover_image: payload.coverImage,
        updated_at: new Date().toISOString(),
      }).eq('id', payload.id);
      if (error) throw error;
      break;
    }
    case 'DELETE_GROUP': {
      const { error } = await supabase.from('groups').update({
        deleted_at: new Date().toISOString(),
      }).eq('id', payload.id);
      if (error) throw error;
      break;
    }
    case 'ADD_MEMBER': {
      const { error } = await supabase.from('group_members').upsert({
        id: payload.id,
        group_id: payload.groupId,
        user_id: sanitizeUuid(payload.userId),
        member_name: payload.memberName,
        member_email: payload.memberEmail || null,
        member_avatar: payload.memberAvatar || null,
        role: payload.role || 'member',
        joined_at: payload.joinedAt,
      });
      if (error) throw error;
      break;
    }
    case 'REMOVE_MEMBER': {
      const { error } = await supabase.from('group_members').delete().eq('id', payload.id);
      if (error) throw error;
      break;
    }
    case 'CREATE_EXPENSE': {
      const { expense, payers, splits } = payload;

      const { error: expError } = await supabase.from('expenses').upsert({
        id: expense.id,
        group_id: expense.groupId,
        title: expense.title,
        amount_cents: expense.amountCents,
        category: expense.category,
        split_mode: expense.splitMode,
        date: expense.date,
        notes: expense.notes,
        created_by: sanitizeUuid(expense.createdBy),
        created_at: expense.createdAt,
        updated_at: expense.updatedAt,
      });
      if (expError) throw expError;

      if (payers && payers.length > 0) {
        const { error: pError } = await supabase.from('expense_payers').upsert(
          payers.map((p: any) => ({
            id: p.id,
            expense_id: p.expenseId,
            member_id: p.memberId,
            amount_cents: p.amountCents,
          }))
        );
        if (pError) throw pError;
      }

      if (splits && splits.length > 0) {
        const { error: sError } = await supabase.from('expense_splits').upsert(
          splits.map((s: any) => ({
            id: s.id,
            expense_id: s.expenseId,
            member_id: s.memberId,
            amount_cents: s.amountCents,
            percentage: s.percentage,
            shares: s.shares,
          }))
        );
        if (sError) throw sError;
      }
      break;
    }
    case 'DELETE_EXPENSE': {
      const { error } = await supabase.from('expenses').update({
        deleted_at: new Date().toISOString(),
      }).eq('id', payload.id);
      if (error) throw error;
      break;
    }
    case 'CREATE_SETTLEMENT': {
      const { error } = await supabase.from('settlements').upsert({
        id: payload.id,
        group_id: payload.groupId,
        payer_member_id: payload.payerMemberId,
        payee_member_id: payload.payeeMemberId,
        amount_cents: payload.amountCents,
        date: payload.date,
        notes: payload.notes,
        created_by: sanitizeUuid(payload.createdBy),
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      });
      if (error) throw error;
      break;
    }
    case 'UNDO_SETTLEMENT': {
      const { error } = await supabase.from('settlements').update({
        deleted_at: new Date().toISOString(),
      }).eq('id', payload.id);
      if (error) throw error;
      break;
    }
  }
}

/**
 * Pulls latest remote changes from Supabase PostgreSQL database into local Dexie IndexedDB.
 */
async function pullRemoteChanges() {
  if (!supabase) return;

  const { data: remoteGroups } = await supabase.from('groups').select('*').is('deleted_at', null);

  if (remoteGroups && remoteGroups.length > 0) {
    for (const rg of remoteGroups) {
      await db.groups.put({
        id: rg.id,
        name: rg.name,
        category: rg.category,
        coverImage: rg.cover_image,
        createdBy: rg.created_by,
        createdAt: rg.created_at,
        updatedAt: rg.updated_at,
      });
    }
  }

  const { data: remoteExpenses } = await supabase.from('expenses').select('*').is('deleted_at', null);

  if (remoteExpenses && remoteExpenses.length > 0) {
    for (const re of remoteExpenses) {
      await db.expenses.put({
        id: re.id,
        groupId: re.group_id,
        title: re.title,
        amountCents: re.amount_cents,
        category: re.category,
        splitMode: re.split_mode,
        date: re.date,
        notes: re.notes,
        createdBy: re.created_by,
        createdAt: re.created_at,
        updatedAt: re.updated_at,
      });
    }
  }
}

// Global Online/Offline Event Listener Setup
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue();
  });
  window.addEventListener('offline', () => {
    notifyStatus();
  });
}
