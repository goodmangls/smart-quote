import React from 'react';
import { Save, Loader2, X } from 'lucide-react';
import type { MarginRule } from '@/api/marginRuleApi';
import { NATIONALITY_OPTIONS } from '@/config/options';

interface Props {
  form: Partial<MarginRule>;
  editingId: number | null;
  saving: boolean;
  onChange: (next: Partial<MarginRule>) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const MarginRuleForm: React.FC<Props> = ({
  form,
  editingId,
  saving,
  onChange,
  onCancel,
  onSave,
}) => (
  <div className='px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700'>
    <div className='space-y-2'>
      <input
        type='text'
        placeholder='Rule name'
        value={form.name || ''}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
      />
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <label className='text-[10px] text-gray-500'>Type</label>
          <select
            value={form.ruleType || 'weight_based'}
            onChange={(e) =>
              onChange({ ...form, ruleType: e.target.value as 'flat' | 'weight_based' })
            }
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          >
            <option value='flat'>Flat</option>
            <option value='weight_based'>Weight-based</option>
          </select>
        </div>
        <div>
          <label className='text-[10px] text-gray-500'>Priority</label>
          <input
            type='number'
            min={0}
            max={200}
            value={form.priority ?? 50}
            onChange={(e) => onChange({ ...form, priority: Number(e.target.value) })}
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <label className='text-[10px] text-gray-500'>Match Email</label>
          <input
            type='text'
            placeholder='(optional)'
            value={form.matchEmail || ''}
            onChange={(e) => onChange({ ...form, matchEmail: e.target.value || null })}
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
        <div>
          <label className='text-[10px] text-gray-500'>Match Nationality</label>
          <select
            value={form.matchNationality || ''}
            onChange={(e) => onChange({ ...form, matchNationality: e.target.value || null })}
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          >
            <option value=''>— Any —</option>
            {NATIONALITY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='grid grid-cols-3 gap-2'>
        <div>
          <label className='text-[10px] text-gray-500'>Weight Min (kg)</label>
          <input
            type='number'
            step='0.5'
            placeholder='—'
            value={form.weightMin ?? ''}
            onChange={(e) =>
              onChange({ ...form, weightMin: e.target.value ? Number(e.target.value) : null })
            }
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
        <div>
          <label className='text-[10px] text-gray-500'>Weight Max (kg)</label>
          <input
            type='number'
            step='0.5'
            placeholder='—'
            value={form.weightMax ?? ''}
            onChange={(e) =>
              onChange({ ...form, weightMax: e.target.value ? Number(e.target.value) : null })
            }
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
        <div>
          <label className='text-[10px] text-gray-500'>Margin %</label>
          <input
            type='number'
            step='0.5'
            min={5}
            max={50}
            value={form.marginPercent ?? 19}
            onChange={(e) => onChange({ ...form, marginPercent: Number(e.target.value) })}
            className='w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
          />
        </div>
      </div>
      <div className='flex justify-end gap-2 pt-1'>
        <button
          onClick={onCancel}
          className='flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600'
        >
          <X className='w-3 h-3' /> Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name}
          className='flex items-center gap-1 text-[10px] font-semibold text-brand-blue-600 hover:text-brand-blue-700 disabled:opacity-50'
        >
          {saving ? <Loader2 className='w-3 h-3 animate-spin' /> : <Save className='w-3 h-3' />}
          {editingId ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  </div>
);
