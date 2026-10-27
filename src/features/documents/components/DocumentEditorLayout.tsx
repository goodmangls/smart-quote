import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, RotateCcw, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface DocumentEditorLayoutProps {
  title: string;
  subtitle: string;
  /** The printable A4 sheet. */
  sheet: React.ReactNode;
  /** The input panel. */
  form: React.ReactNode;
  saved: boolean;
  exportFileName: string;
  onExport: () => string;
  /** Returns an error message, or null when the file was loaded. */
  onImport: (text: string) => string | null;
  onReset: () => void;
}

const toolbarButton =
  'inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors';

/**
 * Preview on the left, form on the right. Printing renders only the
 * `.document-sheet` element — the app chrome, this panel and the support
 * widget are hidden by the print rules in index.css.
 */
export const DocumentEditorLayout = ({
  title,
  subtitle,
  sheet,
  form,
  saved,
  exportFileName,
  onExport,
  onImport,
  onReset,
}: DocumentEditorLayoutProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = () => {
    const blob = new Blob([onExport()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const error = onImport(await file.text());
      if (error) toast('error', error);
      else toast('success', 'Draft loaded.');
    } catch {
      toast('error', 'The file could not be read.');
    }
  };

  return (
    <div className='document-editor'>
      <div className='print:hidden sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8'>
          <Link
            to='/documents'
            className='inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-blue-600 dark:hover:text-white'
          >
            <ArrowLeft className='h-4 w-4' />
            Documents
          </Link>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate text-base font-semibold text-gray-900 dark:text-white'>
              {title}
            </h1>
            <p className='truncate text-xs text-gray-500 dark:text-gray-400'>{subtitle}</p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button type='button' className={toolbarButton} onClick={handleExport}>
              <Download className='h-3.5 w-3.5' />
              Export JSON
            </button>
            <button
              type='button'
              className={toolbarButton}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className='h-3.5 w-3.5' />
              Import JSON
            </button>
            <input
              ref={fileRef}
              type='file'
              accept='application/json,.json'
              className='hidden'
              aria-label='Import draft JSON file'
              onChange={(e) => {
                void handleImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button type='button' className={toolbarButton} onClick={() => setConfirmReset(true)}>
              <RotateCcw className='h-3.5 w-3.5' />
              Reset
            </button>
            <button
              type='button'
              onClick={() => window.print()}
              className='inline-flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-600 transition-colors'
            >
              <Printer className='h-3.5 w-3.5' />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className='mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8'>
        <div className='document-preview overflow-x-auto rounded-lg bg-gray-200/70 dark:bg-gray-900 p-4 sm:p-6 print:overflow-visible print:bg-transparent print:p-0'>
          {sheet}
        </div>

        <aside className='print:hidden space-y-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            The preview updates as you type. Drafts are saved in this browser only — use Export JSON
            to move one to another computer.
          </p>
          {!saved && (
            <p
              role='alert'
              className='rounded-md bg-warning-50 dark:bg-warning-950 px-3 py-2 text-xs text-warning-800 dark:text-warning-200'
            >
              This browser refused to save the draft (storage full or private mode). Export JSON
              before you leave the page.
            </p>
          )}
          {form}
          <p className='border-t border-gray-200 dark:border-gray-800 pt-3 text-xs text-gray-500 dark:text-gray-400'>
            To save a PDF, press Print and choose “Save as PDF”. Turn on “Background graphics” to
            keep the shaded headings.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title='Reset this document?'
        message='Every field goes back to the blank template. Export JSON first if you want to keep the current draft.'
        confirmLabel='Reset'
        onConfirm={() => {
          setConfirmReset(false);
          onReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};

/** The A4 page frame shared by every sheet: always black on white, in either theme. */
export const SheetFrame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <article
    aria-label={label}
    className='document-sheet mx-auto w-[210mm] min-h-[297mm] bg-white p-[14mm] text-[11px] leading-relaxed text-gray-900 shadow-lg print:w-auto print:min-h-0 print:p-0 print:shadow-none'
  >
    {children}
  </article>
);
