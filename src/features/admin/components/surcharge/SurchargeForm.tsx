import React, { useId } from 'react';
import { Save, Loader2, X } from 'lucide-react';
import { type SurchargeRule } from '@/api/surchargeApi';

interface SurchargeFormProps {
  form: Partial<SurchargeRule>;
  editingId: number | null;
  saving: boolean;
  onUpdateForm: (key: string, value: unknown) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const SurchargeForm: React.FC<SurchargeFormProps> = ({
  form,
  editingId,
  saving,
  onUpdateForm,
  onSave,
  onCancel,
}) => {
  // Each field's visible label is associated with its control by id rather than
  // given a separate aria-label, so the visible and accessible names match
  // (WCAG 2.5.3) and clicking the label focuses the field. useId keeps the ids
  // unique if the form is ever rendered more than once on a page.
  const id = useId();
  const fieldId = (name: string) => `${id}-${name}`;

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('code')}
          >
            Code *
          </label>
          <input
            type="text"
            value={form.code || ''}
            onChange={e => onUpdateForm('code', e.target.value)}
            id={fieldId('code')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="WAR_RISK"
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('carrier')}
          >
            Carrier
          </label>
          <select
            value={form.carrier || ''}
            onChange={e => onUpdateForm('carrier', e.target.value)}
            id={fieldId('carrier')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Carriers</option>
            <option value="UPS">UPS</option>
            <option value="DHL">DHL</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('name')}
          >
            Name (EN) *
          </label>
          <input
            type="text"
            value={form.name || ''}
            onChange={e => onUpdateForm('name', e.target.value)}
            id={fieldId('name')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="War Risk Surcharge"
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('nameKo')}
          >
            Name (KO)
          </label>
          <input
            type="text"
            value={form.nameKo || ''}
            onChange={e => onUpdateForm('nameKo', e.target.value)}
            id={fieldId('nameKo')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="전쟁 위험 할증료"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('chargeType')}
          >
            Type
          </label>
          <select
            value={form.chargeType || 'fixed'}
            onChange={e => onUpdateForm('chargeType', e.target.value)}
            id={fieldId('chargeType')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="fixed">Fixed (KRW)</option>
            <option value="rate">Rate (%)</option>
          </select>
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('amount')}
          >
            Amount *
          </label>
          <input
            type="number"
            step="any"
            value={form.amount ?? 0}
            onChange={e => onUpdateForm('amount', Number(e.target.value))}
            id={fieldId('amount')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('zone')}
          >
            Zone
          </label>
          <input
            type="text"
            value={form.zone || ''}
            onChange={e => onUpdateForm('zone', e.target.value)}
            id={fieldId('zone')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Z1,Z2 or empty"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('countryCodes')}
          >
            Country Codes
          </label>
          <input
            type="text"
            value={Array.isArray(form.countryCodes) ? form.countryCodes.join(', ') : form.countryCodes || ''}
            onChange={e => onUpdateForm('countryCodes', e.target.value)}
            id={fieldId('countryCodes')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="IL, UA (comma separated, empty = all)"
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('sourceUrl')}
          >
            Source URL
          </label>
          <input
            type="text"
            value={form.sourceUrl || ''}
            onChange={e => onUpdateForm('sourceUrl', e.target.value)}
            id={fieldId('sourceUrl')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('effectiveFrom')}
          >
            Effective From
          </label>
          <input
            type="date"
            value={form.effectiveFrom || ''}
            onChange={e => onUpdateForm('effectiveFrom', e.target.value)}
            id={fieldId('effectiveFrom')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label
            className="block text-[10px] font-semibold text-gray-500 mb-0.5"
            htmlFor={fieldId('effectiveTo')}
          >
            Effective To
          </label>
          <input
            type="date"
            value={form.effectiveTo || ''}
            onChange={e => onUpdateForm('effectiveTo', e.target.value || null)}
            id={fieldId('effectiveTo')}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={e => onUpdateForm('isActive', e.target.checked)}
              className="rounded border-gray-300"
            />
            Active
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold bg-brand-blue-600 hover:bg-brand-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {editingId ? 'Update' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
};
