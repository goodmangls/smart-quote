import React, { useId, useState } from 'react';
import { MAX_LOGO_DATA_URL_LENGTH } from '../types';

interface LogoFieldProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/** Reads a small logo into a data URL; oversized or non-image files are refused with a message. */
export const LogoField = ({ value, onChange }: LogoFieldProps) => {
  const id = useId();
  const [error, setError] = useState('');

  const handleFile = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError('Use a PNG, JPEG, WebP or GIF image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result.length > MAX_LOGO_DATA_URL_LENGTH) {
        setError('The image is too large. Use a logo under about 280 KB.');
        return;
      }
      onChange(result);
    };
    reader.onerror = () => setError('The image could not be read.');
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400'
      >
        Company logo
      </label>
      <div className='flex items-center gap-3'>
        {value && (
          <img
            src={value}
            alt=''
            className='h-10 w-auto rounded border border-gray-200 bg-white p-1'
          />
        )}
        <input
          id={id}
          type='file'
          accept={ACCEPTED.join(',')}
          className='text-xs text-gray-600 dark:text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:px-2 file:py-1 file:text-xs file:text-gray-700 dark:file:text-gray-200'
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {value && (
          <button
            type='button'
            onClick={() => onChange('')}
            className='text-xs font-medium text-destructive-600 dark:text-destructive-400 hover:underline'
          >
            Remove
          </button>
        )}
      </div>
      {error && (
        <p role='alert' className='mt-1 text-xs text-destructive-600 dark:text-destructive-400'>
          {error}
        </p>
      )}
    </div>
  );
};
