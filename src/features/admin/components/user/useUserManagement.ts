import { useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/browser';
import type { FreightNetwork } from '@/contexts/AuthContext';
import {
  listUsers,
  updateUser,
  deleteUser,
  type AdminUser,
  type UpdateUserParams,
} from '@/api/userApi';
import { useToast } from '@/components/ui/Toast';

export function useUserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserParams>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      Sentry.captureException(e);
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditClick = (user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name || '',
      company: user.company || '',
      nationality: user.nationality || '',
      role: user.role,
      networks: user.networks || [],
    });
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveClick = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await updateUser(editingId, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)));
      setEditingId(null);
      setEditForm({});
    } catch (e) {
      Sentry.captureException(e);
      toast('error', e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (id: number) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteConfirmId(null);
    } catch (e) {
      Sentry.captureException(e);
      toast('error', e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  const handleFormChange = (key: keyof UpdateUserParams, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNetwork = (net: FreightNetwork) => {
    setEditForm((prev) => {
      const current = (prev.networks || []) as string[];
      const updated = current.includes(net) ? current.filter((n) => n !== net) : [...current, net];
      return { ...prev, networks: updated };
    });
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    editingId,
    editForm,
    saving,
    deleteConfirmId,
    handleEditClick,
    handleCancelClick,
    handleSaveClick,
    handleDeleteClick,
    handleFormChange,
    toggleNetwork,
  };
}
