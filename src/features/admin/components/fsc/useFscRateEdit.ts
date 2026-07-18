import { useState } from 'react';
import { updateFscRate } from '@/api/fscApi';
import type { FscRates } from '@/api/fscApi';

export function useFscRateEdit(data: FscRates | null, fetchRates: () => Promise<void> | void) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRates, setEditRates] = useState({ UPS: '', DHL: '' });

  const handleEditStart = () => {
    setEditRates({
      UPS: String(data?.rates.UPS.international ?? ''),
      DHL: String(data?.rates.DHL.international ?? ''),
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsRate = parseFloat(editRates.UPS);
      const dhlRate = parseFloat(editRates.DHL);
      if (!isNaN(upsRate)) await updateFscRate('UPS', upsRate, upsRate);
      if (!isNaN(dhlRate)) await updateFscRate('DHL', dhlRate, dhlRate);
      await fetchRates();
      setIsEditing(false);
    } catch {
      // error surfaced via useFscRates error state
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setIsEditing(false);

  return {
    isEditing,
    saving,
    editRates,
    setEditRates,
    handleEditStart,
    handleSave,
    handleCancel,
  };
}
