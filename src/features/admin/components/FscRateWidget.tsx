import React from 'react';
import { Fuel, RefreshCw, Loader2, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import { useFscRateEdit, useFscHistory, FscRateDisplay, FscHistoryPanel } from './fsc';

interface FscRateWidgetProps {
  readOnly?: boolean;
}

export const FscRateWidget: React.FC<FscRateWidgetProps> = ({ readOnly = false }) => {
  const { data, loading, error: ratesError, retry: fetchRates } = useFscRates();
  const {
    isEditing,
    saving,
    saveError,
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
    latestFedex,
  } = useFscHistory();

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
      <div className='px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Fuel className='w-4 h-4 text-brand-blue-500' />
          <h4 className='text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider'>
            FSC Rates (International)
          </h4>
        </div>
        <div className='flex items-center gap-2'>
          {!readOnly && isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-1 text-[10px] font-semibold text-green-600 hover:text-green-700 dark:text-green-400 transition-colors disabled:opacity-50'
                title='저장'
                aria-label='FSC 요율 저장'
              >
                {saving ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Check className='w-3.5 h-3.5' />
                )}
              </button>
              {/* Only after a failed save. The recovery advice is "check 현재 DB", and
                  the plain refresh control is hidden while editing — without this the
                  admin would have to cancel (losing their input) to re-read the table. */}
              {saveError && (
                <button
                  onClick={fetchRates}
                  disabled={loading || saving}
                  className='text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors disabled:opacity-40'
                  title='현재 DB 값 다시 읽기'
                  aria-label='현재 DB 값 다시 읽기'
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={handleCancel}
                disabled={saving}
                className='text-[10px] font-semibold text-gray-400 hover:text-red-500 dark:text-gray-500 transition-colors'
                title='취소'
                aria-label='FSC 요율 편집 취소'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </>
          ) : (
            <>
              {!readOnly && (
                <button
                  onClick={handleEditStart}
                  disabled={loading || !data}
                  className='text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors disabled:opacity-40'
                  title='FSC 요율 편집'
                  aria-label='FSC 요율 편집'
                >
                  <Pencil className='w-3.5 h-3.5' />
                </button>
              )}
              <button
                onClick={fetchRates}
                disabled={loading}
                className='text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors'
                title='새로고침'
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div
          role='alert'
          className='px-4 py-2 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 flex items-start gap-2'
        >
          <AlertTriangle className='w-3.5 h-3.5 mt-0.5 shrink-0 text-red-600 dark:text-red-400' />
          <p className='text-[11px] leading-relaxed text-red-700 dark:text-red-300'>{saveError}</p>
        </div>
      )}

      <FscRateDisplay
        data={data}
        loading={loading}
        isEditing={!readOnly && isEditing}
        editRates={editRates}
        onEditRatesChange={setEditRates}
        saveError={saveError}
        ratesError={ratesError}
      />

      <FscHistoryPanel
        showHistory={showHistory}
        onToggle={() => setShowHistory((v) => !v)}
        history={history}
        chartLines={chartLines}
        latestUps={latestUps}
        latestDhl={latestDhl}
        latestFedex={latestFedex}
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
        <div className='px-4 py-2 border-t border-gray-100 dark:border-gray-700'>
          <span className='text-[10px] text-gray-400 dark:text-gray-400'>
            Source: DB / rates.ts fallback
          </span>
        </div>
      )}
    </div>
  );
};
