import React from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { FscHistoryData } from '@/config/fsc-history';
import { FscChart } from '../FscChart';

type HistoryCarrier = 'ups' | 'dhl' | 'fedex';

interface ChartLine {
  entries: { date: string; rate: number }[];
  color: string;
  label: string;
}

interface Props {
  showHistory: boolean;
  onToggle: () => void;
  history: FscHistoryData;
  chartLines: ChartLine[];
  latestUps: number | null;
  latestDhl: number | null;
  latestFedex: number | null;
  readOnly: boolean;
  addCarrier: HistoryCarrier;
  addDate: string;
  addRate: string;
  onAddCarrierChange: (v: HistoryCarrier) => void;
  onAddDateChange: (v: string) => void;
  onAddRateChange: (v: string) => void;
  onAddEntry: () => void;
  onRemoveEntry: (carrier: HistoryCarrier, date: string) => void;
}

export const FscHistoryPanel: React.FC<Props> = ({
  showHistory,
  onToggle,
  history,
  chartLines,
  latestUps,
  latestDhl,
  latestFedex,
  readOnly,
  addCarrier,
  addDate,
  addRate,
  onAddCarrierChange,
  onAddDateChange,
  onAddRateChange,
  onAddEntry,
  onRemoveEntry,
}) => (
  <div className='border-t border-gray-100 dark:border-gray-700'>
    <button
      onClick={onToggle}
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
        <div className='rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 p-2'>
          <FscChart lines={chartLines} />
        </div>

        <div className='flex flex-wrap items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400'>
          <div className='flex items-center gap-1.5'>
            <span className='inline-block w-2.5 h-2.5 rounded-full bg-blue-500' />
            <span>UPS{latestUps !== null ? ` — ${latestUps}%` : ''}</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='inline-block w-2.5 h-2.5 rounded-full bg-amber-500' />
            <span>DHL{latestDhl !== null ? ` — ${latestDhl}%` : ''}</span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='inline-block w-2.5 h-2.5 rounded-full bg-emerald-500' />
            <span>FEDEX{latestFedex !== null ? ` — ${latestFedex}%` : ''}</span>
          </div>
        </div>

        <div className='text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5'>
          <p>UPS / DHL / FedEx: 매주 월요일 갱신 (Weekly, every Monday)</p>
        </div>

        {!readOnly && (
          <div className='rounded-lg border border-gray-200 dark:border-gray-600 p-3 space-y-2'>
            <p className='text-[10px] font-semibold text-gray-600 dark:text-gray-300'>
              Add History Entry
            </p>
            <div className='flex flex-wrap items-end gap-2'>
              <div>
                <label className='block text-[10px] text-gray-400 mb-0.5'>Carrier</label>
                <select
                  value={addCarrier}
                  onChange={(e) => onAddCarrierChange(e.target.value as HistoryCarrier)}
                  className='px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                >
                  <option value='ups'>UPS</option>
                  <option value='dhl'>DHL</option>
                  <option value='fedex'>FEDEX</option>
                </select>
              </div>
              <div>
                <label className='block text-[10px] text-gray-400 mb-0.5'>Date (YYYY-MM-DD)</label>
                <input
                  type='date'
                  value={addDate}
                  onChange={(e) => onAddDateChange(e.target.value)}
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
                  onChange={(e) => onAddRateChange(e.target.value)}
                  placeholder='38.50'
                  className='w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                />
              </div>
              <button
                onClick={onAddEntry}
                disabled={!addDate || !addRate}
                className='flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-brand-blue-600 hover:bg-brand-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors'
              >
                <Plus className='w-3 h-3' />
                Add
              </button>
            </div>
          </div>
        )}

        <div className='max-h-40 overflow-y-auto space-y-1'>
          {(['ups', 'dhl', 'fedex'] as const).map((carrier) => (
            <div key={carrier}>
              <p className='text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5'>
                {carrier}
              </p>
              {(history[carrier] ?? []).map((entry) => (
                <div
                  key={`${carrier}-${entry.date}`}
                  className='flex items-center justify-between py-0.5 px-1 text-[10px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded'
                >
                  <span>
                    {entry.date} — {entry.rate}%
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => onRemoveEntry(carrier, entry.date)}
                      className='text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors'
                      title='Delete entry'
                    >
                      <Trash2 className='w-3 h-3' />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
