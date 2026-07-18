import { useState } from 'react';
import * as Sentry from '@sentry/browser';
import { useMarginRules } from '@/features/dashboard/hooks/useMarginRules';
import {
  createMarginRule,
  updateMarginRule,
  deleteMarginRule,
  type MarginRule,
} from '@/api/marginRuleApi';
import { useToast } from '@/components/ui/Toast';
import { EMPTY_FORM, priorityLabel } from './marginRuleUtils';

export function useMarginRuleCrud() {
  const { rules, loading, error, refetch } = useMarginRules();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<MarginRule>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const activeRules = rules.filter((r) => r.isActive);

  const groupedRules = activeRules.reduce<Record<string, MarginRule[]>>((acc, rule) => {
    const label = priorityLabel(rule.priority);
    if (!acc[label]) acc[label] = [];
    acc[label].push(rule);
    return acc;
  }, {});

  const startEdit = (rule: MarginRule) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      ruleType: rule.ruleType,
      priority: rule.priority,
      matchEmail: rule.matchEmail,
      matchNationality: rule.matchNationality,
      weightMin: rule.weightMin,
      weightMax: rule.weightMax,
      marginPercent: rule.marginPercent,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm(EMPTY_FORM);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        rule_type: form.ruleType,
        priority: form.priority,
        match_email: form.matchEmail || null,
        match_nationality: form.matchNationality || null,
        weight_min: form.weightMin ?? null,
        weight_max: form.weightMax ?? null,
        margin_percent: form.marginPercent,
      };

      if (editingId) {
        await updateMarginRule(editingId, payload as Partial<MarginRule>);
      } else {
        await createMarginRule(payload as Partial<MarginRule>);
      }
      cancelEdit();
      await refetch();
    } catch (e) {
      Sentry.captureException(e);
      toast('error', e instanceof Error ? e.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await deleteMarginRule(id);
      await refetch();
    } catch (e) {
      Sentry.captureException(e);
      toast('error', e instanceof Error ? e.message : 'Failed to delete rule');
    } finally {
      setDeletingId(null);
    }
  };

  return {
    loading,
    error,
    refetch,
    showAddForm,
    editingId,
    form,
    setForm,
    saving,
    deletingId,
    confirmDeleteId,
    setConfirmDeleteId,
    activeRules,
    groupedRules,
    startEdit,
    cancelEdit,
    toggleAddForm,
    handleSave,
    handleDelete,
  };
}
