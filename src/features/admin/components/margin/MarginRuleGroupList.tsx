import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { MarginRule } from '@/api/marginRuleApi';
import { MarginRuleForm } from './MarginRuleForm';
import { PriorityIcon, conditionLabel, priorityColor } from './marginRuleUtils';

interface Props {
  loading: boolean;
  activeCount: number;
  groupedRules: Record<string, MarginRule[]>;
  editingId: number | null;
  form: Partial<MarginRule>;
  saving: boolean;
  deletingId: number | null;
  onFormChange: (next: Partial<MarginRule>) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onStartEdit: (rule: MarginRule) => void;
  onRequestDelete: (id: number) => void;
}

export const MarginRuleGroupList: React.FC<Props> = ({
  loading,
  activeCount,
  groupedRules,
  editingId,
  form,
  saving,
  deletingId,
  onFormChange,
  onCancelEdit,
  onSave,
  onStartEdit,
  onRequestDelete,
}) => {
  if (loading && activeCount === 0) {
    return (
      <div className='p-6 text-center text-xs text-gray-400'>
        <Loader2 className='w-4 h-4 animate-spin mx-auto' />
      </div>
    );
  }

  return (
    <div className='divide-y divide-gray-100 dark:divide-gray-700'>
      {Object.entries(groupedRules).map(([group, groupRules]) => {
        const colors = priorityColor(groupRules[0].priority);
        return (
          <div key={group} className='px-4 py-3'>
            <div className='flex items-center gap-1.5 mb-2'>
              <span className={colors.icon}>
                <PriorityIcon priority={groupRules[0].priority} />
              </span>
              <span className='text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                P{groupRules[0].priority} — {group}
              </span>
            </div>
            <div className='space-y-1.5'>
              {groupRules.map((rule) =>
                editingId === rule.id ? (
                  <div key={rule.id}>
                    <MarginRuleForm
                      form={form}
                      editingId={editingId}
                      saving={saving}
                      onChange={onFormChange}
                      onCancel={onCancelEdit}
                      onSave={onSave}
                    />
                  </div>
                ) : (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between ${colors.bg} rounded-lg px-3 py-2 group`}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='text-xs font-semibold text-gray-900 dark:text-white truncate'>
                        {rule.name}
                      </p>
                      <p className='text-[10px] text-gray-500 dark:text-gray-400 truncate'>
                        {conditionLabel(rule)}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 ml-2'>
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {rule.marginPercent}%
                      </span>
                      <div className='hidden group-hover:flex items-center gap-1'>
                        <button
                          onClick={() => onStartEdit(rule)}
                          className='text-[10px] font-semibold text-gray-400 hover:text-brand-blue-600 transition-colors'
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onRequestDelete(rule.id)}
                          disabled={deletingId === rule.id}
                          className='text-gray-400 hover:text-red-500 transition-colors'
                        >
                          {deletingId === rule.id ? (
                            <Loader2 className='w-3 h-3 animate-spin' />
                          ) : (
                            <Trash2 className='w-3 h-3' />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
