import React from 'react';
import { Fuel, RefreshCw, Loader2, Pencil, Check, X } from 'lucide-react';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import {
  useFscRateEdit,
  useFscHistory,
  FscRateDisplay,
  FscHistoryPanel,
} from './fsc';

interface FscRateWidgetProps {
  readOnly?: boolean;
}

export const FscRateWidget: React.FC<FscRateWidgetProps> = ({ readOnly = false }) => {
  const { data, loading, retry: fetchRates } = useFscRates();
  const {
    isEditing,
    saving,
    editRates,
    setEditRates,
    handleEditStart,
    handleSave,
    handleCancel,
  } = useFscRateEdit(data, fetchRates);
  const {
    history,
    showHistory,
    setShowHistory,
    addCarrier,
    setAddCarrier,
    addDate,
    setAddDate,
    addRate,
    setAddRate,
    handleAddEntry,
    handleRemoveEntry,
    chartLines,
    latestUps,
    latestDhl,
  } = useFscHistory();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-brand-blue-500" />
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            FSC Rates (International)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 text-[10px] font-semibold text-green-600 hover:text-green-700 dark:text-green-400 transition-colors disabled:opacity-50"
                title="저장"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-[10px] font-semibold text-gray-400 hover:text-red-500 dark:text-gray-500 transition-colors"
                title="취소"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {!readOnly && (
                <button
                  onClick={handleEditStart}
                  disabled={loading || !data}
                  className="text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors disabled:opacity-40"
                  title="FSC 요율 편집"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={fetchRates}
                disabled={loading}
                className="text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      <FscRateDisplay
        data={data}
        loading={loading}
        isEditing={!readOnly && isEditing}
        editRates={editRates}
        onEditRatesChange={setEditRates}
      />

      <FscHistoryPanel
        showHistory={showHistory}
        onToggle={() => setShowHistory((v) => !v)}
        history={history}
        chartLines={chartLines}
        latestUps={latestUps}
        latestDhl={latestDhl}
        readOnly={readOnly}
        addCarrier={addCarrier}
        addDate={addDate}
        addRate={addRate}
        onAddCarrierChange={setAddCarrier}
        onAddDateChange={setAddDate}
        onAddRateChange={setAddRate}
        onAddEntry={handleAddEntry}
        onRemoveEntry={handleRemoveEntry}
      />

      {data && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-[10px] text-gray-400 dark:text-gray-400">
            Source: DB / rates.ts fallback
          </span>
        </div>
      )}
    </div>
  );
};
