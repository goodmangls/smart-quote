import { useState, useCallback, useMemo } from 'react';
import { CHART_COLORS } from '@/lib/chartColors';
import {
  type FscHistoryData,
  type FscHistoryEntry,
  loadFscHistory,
  saveFscHistory,
  addFscEntry,
  removeFscEntry,
} from '@/config/fsc-history';

type HistoryCarrier = 'ups' | 'dhl' | 'fedex';

export function useFscHistory() {
  const [history, setHistory] = useState<FscHistoryData>(() => loadFscHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [addCarrier, setAddCarrier] = useState<HistoryCarrier>('ups');
  const [addDate, setAddDate] = useState('');
  const [addRate, setAddRate] = useState('');

  const persistHistory = useCallback((next: FscHistoryData) => {
    setHistory(next);
    saveFscHistory(next);
  }, []);

  const handleAddEntry = () => {
    if (!addDate || !addRate) return;
    const rateNum = parseFloat(addRate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) return;

    const entry: FscHistoryEntry = { date: addDate, rate: rateNum };
    persistHistory(addFscEntry(history, addCarrier, entry));
    setAddDate('');
    setAddRate('');
  };

  const handleRemoveEntry = (carrier: HistoryCarrier, date: string) => {
    persistHistory(removeFscEntry(history, carrier, date));
  };

  const chartLines = useMemo(
    () => [
      { entries: history.ups, color: CHART_COLORS.brandBlue, label: 'UPS' },
      { entries: history.dhl, color: CHART_COLORS.gold, label: 'DHL' },
      { entries: history.fedex, color: CHART_COLORS.success, label: 'FEDEX' },
    ],
    [history],
  );

  const latestUps = history.ups.length > 0 ? history.ups[history.ups.length - 1].rate : null;
  const latestDhl = history.dhl.length > 0 ? history.dhl[history.dhl.length - 1].rate : null;
  const latestFedex =
    history.fedex.length > 0 ? history.fedex[history.fedex.length - 1].rate : null;

  return {
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
  };
}
