import React, { useState, useCallback, useMemo } from 'react';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import { updateFscRate } from '@/api/fscApi';
import { CHART_COLORS } from '@/lib/chartColors';
import {
  Fuel,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  TriangleAlert,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import {
  FscHistoryData,
  FscHistoryEntry,
  loadFscHistory,
  saveFscHistory,
  addFscEntry,
  removeFscEntry,
  FscCarrier,
} from '@/config/fsc-history';
import { FscChart } from './FscChart';

/* ──────────────────────────────── main widget ───────────────────────────── */

interface FscRateWidgetProps {
  readOnly?: boolean;
}

export const FscRateWidget: React.FC<FscRateWidgetProps> = () => {
  const { data, loading, retry: fetchRates } = useFscRates();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRates, setEditRates] = useState({ UPS: '', DHL: '', FEDEX: '' });

  const handleEditStart = () => {
    setEditRates({
      UPS: String(data?.rates.UPS.international ?? ''),
      DHL: String(data?.rates.DHL.international ?? ''),
      FEDEX: String(data?.rates.FEDEX.international ?? ''),
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsRate = parseFloat(editRates.UPS);
      const dhlRate = parseFloat(editRates.DHL);
      const fedexRate = parseFloat(editRates.FEDEX);
      if (!isNaN(upsRate)) await updateFscRate('UPS', upsRate, upsRate);
      if (!isNaN(dhlRate)) await updateFscRate('DHL', dhlRate, dhlRate);
      if (!isNaN(fedexRate)) await updateFscRate('FEDEX', fedexRate, fedexRate);
      await fetchRates();
      setIsEditing(false);
    } catch {
      // error surfaced via useFscRates error state
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setIsEditing(false);

  // History state
  const [history, setHistory] = useState<FscHistoryData>(() => loadFscHistory());
  const [showHistory, setShowHistory] = useState(false);

  // Add-entry form state
  const [addCarrier, setAddCarrier] = useState<FscCarrier>('ups');
  const [addDate, setAddDate] = useState('');
  const [addRate, setAddRate] = useState('');

  const carrierLinks = {
    UPS: 'https://www.ups.com/kr/ko/support/shipping-support/shipping-costs-rates/fuel-surcharges.page',
    DHL: 'https://mydhl.express.dhl/kr/ko/ship/surcharges.html',
    FEDEX: 'https://www.fedex.com/ko-kr/shipping/surcharges.html',
  };

  // History handlers
  const persistHistory = useCallback((next: FscHistoryData) => {
    setHistory(next);
    saveFscHistory(next);
  }, []);

  const handleAddEntry = () => {
    if (!addDate || !addRate) return;
    const rateNum = parseFloat(addRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) return;

    const entry: FscHistoryEntry = { date: addDate, rate: rateNum };
    const next = addFscEntry(history, addCarrier, entry);
    persistHistory(next);
    setAddDate('');
    setAddRate('');
  };

  const handleRemoveEntry = (carrier: FscCarrier, date: string) => {
    const next = removeFscEntry(history, carrier, date);
    persistHistory(next);
  };

  // Chart lines
  const chartLines = useMemo(
    () => [
      { entries: history.ups, color: CHART_COLORS.brandBlue, label: 'UPS' },
      { entries: history.dhl, color: CHART_COLORS.gold, label: 'DHL' },
      { entries: history.fedex, color: '#f97316', label: 'FedEx' },
    ],
    [history],
  );

  const latestUps = history.ups.length > 0 ? history.ups[history.ups.length - 1].rate : null;
  const latestDhl = history.dhl.length > 0 ? history.dhl[history.dhl.length - 1].rate : null;
  const latestFedex = history.fedex.length > 0 ? history.fedex[history.fedex.length - 1].rate : null;

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
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex items-center gap-1 text-[10px] font-semibold text-green-600 hover:text-green-700 dark:text-green-400 transition-colors disabled:opacity-50'
                title='저장'
              >
                {saving ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Check className='w-3.5 h-3.5' />
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className='text-[10px] font-semibold text-gray-400 hover:text-red-500 dark:text-gray-500 transition-colors'
                title='취소'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEditStart}
                disabled={loading || !data}
                className='text-[10px] font-semibold text-gray-500 hover:text-brand-blue-600 dark:text-gray-400 transition-colors disabled:opacity-40'
                title='FSC 요율 편집'
              >
                <Pencil className='w-3.5 h-3.5' />
              </button>
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

      {loading && !data ? (
        <div className='p-6 text-center text-xs text-gray-400'>
          <Loader2 className='w-4 h-4 animate-spin mx-auto' />
        </div>
      ) : data ? (
        <div className='divide-y divide-gray-100 dark:divide-gray-700'>
          {(['UPS', 'DHL', 'FEDEX'] as const).map((carrier) => {
            const rates = data.rates[carrier];
            const link = carrierLinks[carrier];

            const editKey = carrier as 'UPS' | 'DHL' | 'FEDEX';

            return (
              <div key={carrier} className='px-4 py-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-gray-900 dark:text-white'>
                      {carrier}
                    </span>
                    <a
                      href={link}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-gray-400 hover:text-brand-blue-500 transition-colors'
                      title={`${carrier} 공식 연료 할증료 페이지 열기`}
                    >
                      <ExternalLink className='w-3.5 h-3.5' />
                    </a>
                  </div>
                </div>
                {isEditing ? (
                  <div className='flex items-center gap-1.5'>
                    <input
                      type='number'
                      step='0.25'
                      min={0}
                      max={100}
                      value={editRates[editKey]}
                      onChange={(e) =>
                        setEditRates((prev) => ({ ...prev, [editKey]: e.target.value }))
                      }
                      className='w-20 px-2 py-1 text-sm font-bold rounded border border-brand-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue-500'
                    />
                    <span className='text-sm font-bold text-gray-500 dark:text-gray-400'>%</span>
                  </div>
                ) : (
                  <p className='text-xl font-bold text-gray-900 dark:text-white'>
                    {rates.international}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className='p-6 text-center text-xs text-gray-400'>Failed to load rates</div>
      )}

      {/* ────────────── FSC Alert Banner ────────────── */}
      <div className='mx-4 my-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5'>
        <TriangleAlert className='w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5' />
        <p className='text-[11px] leading-relaxed text-amber-700 dark:text-amber-300'>
          최근 유류할증료가 급등하고 있습니다. 견적 전 각 Carrier 공식 사이트에서 최신 FSC를 반드시
          확인하세요.
        </p>
      </div>

      {/* ────────────── Historical Chart Section ────────────── */}
      <div className='border-t border-gray-100 dark:border-gray-700'>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className='w-full px-4 py-2 flex items-center justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors'
        >
          <span>History</span>
          {showHistory ? (
            <ChevronUp className='w-3.5 h-3.5' />
          ) : (
            <ChevronDown className='w-3.5 h-3.5' />
          )}
        </button>

        {showHistory && (
          <div className='px-4 pb-4 space-y-3'>
            {/* SVG Chart */}
            <div className='rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 p-2'>
              <FscChart lines={chartLines} />
            </div>

            {/* Legend */}
            <div className='flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400'>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-blue-500' />
                <span>UPS (Weekly){latestUps !== null ? ` — ${latestUps}%` : ''}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-amber-500' />
                <span>DHL (Weekly){latestDhl !== null ? ` — ${latestDhl}%` : ''}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span className='inline-block w-2.5 h-2.5 rounded-full bg-orange-500' />
                <span>FedEx (Weekly){latestFedex !== null ? ` — ${latestFedex}%` : ''}</span>
              </div>
            </div>

            {/* Update frequency notes */}
            <div className='text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5'>
              <p>UPS: 매주 월요일 갱신 (Weekly, every Monday)</p>
              <p>DHL: 매주 월요일 갱신 (Weekly, every Monday)</p>
            </div>

            {/* Add Entry Form */}
            <div className='rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2'>
              <p className='text-[10px] font-semibold text-gray-600 dark:text-gray-300'>
                Add History Entry
              </p>
              <div className='flex flex-wrap items-end gap-2'>
                <div>
                  <label className='block text-[10px] text-gray-400 mb-0.5'>Carrier</label>
                  <select
                    value={addCarrier}
                    onChange={(e) => setAddCarrier(e.target.value as FscCarrier)}
                    className='px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  >
                    <option value='ups'>UPS</option>
                    <option value='dhl'>DHL</option>
                    <option value='fedex'>FedEx</option>
                  </select>
                </div>
                <div>
                  <label className='block text-[10px] text-gray-400 mb-0.5'>
                    Date (YYYY-MM-DD)
                  </label>
                  <input
                    type='date'
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className='px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
                <div>
                  <label className='block text-[10px] text-gray-400 mb-0.5'>Rate (%)</label>
                  <input
                    type='number'
                    step='0.25'
                    min={0}
                    max={100}
                    value={addRate}
                    onChange={(e) => setAddRate(e.target.value)}
                    placeholder='38.50'
                    className='w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                  />
                </div>
                <button
                  onClick={handleAddEntry}
                  disabled={!addDate || !addRate}
                  className='flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-brand-blue-600 hover:bg-brand-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
                >
                  <Plus className='w-3 h-3' />
                  Add
                </button>
              </div>
            </div>

            {/* Entry list with delete */}
            <div className='max-h-40 overflow-y-auto space-y-1'>
              {(['ups', 'dhl', 'fedex'] as const).map((carrier) => (
                <div key={carrier}>
                  <p className='text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5'>
                    {carrier}
                  </p>
                  {history[carrier].map((entry) => (
                    <div
                      key={`${carrier}-${entry.date}`}
                      className='flex items-center justify-between py-0.5 px-1 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded'
                    >
                      <span>
                        {entry.date} — {entry.rate}%
                      </span>
                      <button
                        onClick={() => handleRemoveEntry(carrier, entry.date)}
                        className='text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors'
                        title='Delete entry'
                      >
                        <Trash2 className='w-3 h-3' />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
