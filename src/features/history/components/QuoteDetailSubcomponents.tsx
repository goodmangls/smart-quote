import React from 'react';
import { formatNum } from '@/lib/format';

export const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  /** ReactNode, not string: the margin card renders a badge beside the figure. */
  value: React.ReactNode;
}> = ({
  icon,
  label,
  value,
}) => (
  <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3'>
    <div className='flex items-center gap-1.5 mb-1'>
      {icon}
      <span className='text-xs text-gray-500 dark:text-gray-400'>{label}</span>
    </div>
    <p className='text-sm font-bold text-gray-900 dark:text-white truncate'>{value}</p>
  </div>
);

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2'>
      {title}
    </h4>
    {children}
  </div>
);

export const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className='flex justify-between py-1'>
    <span className='text-gray-500 dark:text-gray-400'>{label}</span>
    <span className='font-medium text-gray-900 dark:text-white'>{value}</span>
  </div>
);

export const BreakdownRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  if (value === 0) return null;
  return (
    <div className='flex justify-between text-gray-600 dark:text-gray-300'>
      <span>{label}</span>
      <span className='tabular-nums'>{formatNum(value)} KRW</span>
    </div>
  );
};
