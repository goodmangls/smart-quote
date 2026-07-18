import React from 'react';
import { Percent, RefreshCw, Plus, XCircle } from 'lucide-react';
import {
  useMarginRuleCrud,
  MarginRuleForm,
  MarginRuleGroupList,
  MarginRuleDeleteConfirm,
} from './margin';

export const TargetMarginRulesWidget: React.FC = () => {
  const {
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
  } = useMarginRuleCrud();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-brand-blue-500" />
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Target Margin Rules
          </h4>
          <span className="text-[10px] text-gray-400">({activeRules.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAddForm}
            aria-label="Add margin rule"
            className="text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={refetch}
            disabled={loading}
            aria-label="Refresh margin rules"
            className="text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={refetch} className="underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {showAddForm && (
        <MarginRuleForm
          form={form}
          editingId={editingId}
          saving={saving}
          onChange={setForm}
          onCancel={cancelEdit}
          onSave={handleSave}
        />
      )}

      <MarginRuleGroupList
        loading={loading}
        activeCount={activeRules.length}
        groupedRules={groupedRules}
        editingId={editingId}
        form={form}
        saving={saving}
        deletingId={deletingId}
        onFormChange={setForm}
        onCancelEdit={cancelEdit}
        onSave={handleSave}
        onStartEdit={startEdit}
        onRequestDelete={setConfirmDeleteId}
      />

      {confirmDeleteId && (
        <MarginRuleDeleteConfirm
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
        />
      )}

      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Priority: higher wins · Visibility: hidden for member role
        </span>
      </div>
    </div>
  );
};
