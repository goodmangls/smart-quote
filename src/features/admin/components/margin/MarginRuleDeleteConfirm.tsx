import React from 'react';

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
}

export const MarginRuleDeleteConfirm: React.FC<Props> = ({ onCancel, onConfirm }) => (
  <div className='px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800'>
    <p className='text-xs text-red-700 dark:text-red-300 mb-2'>
      Are you sure you want to delete this rule? This will deactivate it.
    </p>
    <div className='flex justify-end gap-2'>
      <button
        onClick={onCancel}
        className='text-[10px] font-semibold text-gray-500 hover:text-gray-700 px-2 py-1'
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className='text-[10px] font-semibold text-red-600 hover:text-red-800 px-2 py-1'
      >
        Confirm Delete
      </button>
    </div>
  </div>
);
