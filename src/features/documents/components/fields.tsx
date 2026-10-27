import React, { useId, useState } from 'react';

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-brand-blue-500 focus:outline-none';

interface FieldShellProps {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}

const FieldShell = ({ label, id, children, className = '' }: FieldShellProps) => (
  <div className={className}>
    <label htmlFor={id} className='mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400'>
      {label}
    </label>
    {children}
  </div>
);

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
}: TextFieldProps) => {
  const id = useId();
  return (
    <FieldShell label={label} id={id} className={className}>
      <input
        id={id}
        type='text'
        className={inputClass}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
};

interface TextAreaFieldProps extends TextFieldProps {
  rows?: number;
}

export const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  className,
}: TextAreaFieldProps) => {
  const id = useId();
  return (
    <FieldShell label={label} id={id} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
};

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  className?: string;
}

const parseAmount = (raw: string): number => {
  const next = Number(raw);
  return Number.isFinite(next) && next > 0 ? next : 0;
};

const formatAmount = (value: number): string =>
  Number.isFinite(value) && value !== 0 ? String(value) : '';

/**
 * Empty or invalid input reads as 0; negatives are clamped, matching the schema.
 *
 * The box shows what was typed, not the parsed number: deriving it from the
 * number blanked the "0" of "0.8" mid-typing and left ".8" on screen. The draft
 * resyncs only when the value changes from outside (import, reset).
 */
export const NumberField = ({ label, value, onChange, step = 1, className }: NumberFieldProps) => {
  const id = useId();
  const [draft, setDraft] = useState(() => formatAmount(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (parseAmount(draft) !== value) setDraft(formatAmount(value));
  }

  return (
    <FieldShell label={label} id={id} className={className}>
      <input
        id={id}
        type='number'
        inputMode='decimal'
        min={0}
        step={step}
        className={inputClass}
        value={draft}
        placeholder='0'
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseAmount(e.target.value));
        }}
      />
    </FieldShell>
  );
};

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}

export const SelectField = <T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SelectFieldProps<T>) => {
  const id = useId();
  return (
    <FieldShell label={label} id={id} className={className}>
      <select
        id={id}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
};

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const FormSection = ({ title, children, action }: FormSectionProps) => (
  <section className='border-t border-gray-200 dark:border-gray-800 pt-4 first:border-t-0 first:pt-0'>
    <div className='mb-3 flex items-center justify-between'>
      <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>{title}</h3>
      {action}
    </div>
    <div className='space-y-3'>{children}</div>
  </section>
);

/** Renders newline-separated text as lines — never as HTML. */
export const MultiLine = ({ text, className }: { text: string; className?: string }) => (
  <>
    {text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line, i) => (
        <span key={i} className={`block ${className ?? ''}`}>
          {line}
        </span>
      ))}
  </>
);

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const CheckboxField = ({ label, checked, onChange, className = '' }: CheckboxFieldProps) => {
  const id = useId();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        id={id}
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className='h-4 w-4 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500 dark:border-gray-600'
      />
      <label htmlFor={id} className='text-xs text-gray-700 dark:text-gray-300'>
        {label}
      </label>
    </div>
  );
};
