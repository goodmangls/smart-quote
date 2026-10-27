import React from 'react';
import { clearDraft, exportDraft, importDraft, loadDraft, type DraftSpec } from '../storage';
import { useDocumentDraft, type DocumentDraft } from '../useDocumentDraft';
import { DocumentEditorLayout } from './DocumentEditorLayout';

const fileStamp = (name: string) => (name.trim() || 'draft').replace(/[^\w.-]+/g, '_');

interface DraftEditorProps<T extends object> {
  spec: DraftSpec<T>;
  title: string;
  subtitle: string;
  /** File name prefix for Export JSON, e.g. `quotation`. */
  filePrefix: string;
  /** The document number the export file is named after. */
  fileNumber: (value: T) => string;
  sheet: (value: T) => React.ReactNode;
  form: (draft: DocumentDraft<T>) => React.ReactNode;
}

/** Wires one draft record to the editor layout: autosave, export, import, reset. */
export const DraftEditor = <T extends object>({
  spec,
  title,
  subtitle,
  filePrefix,
  fileNumber,
  sheet,
  form,
}: DraftEditorProps<T>) => {
  const draft = useDocumentDraft(spec.storageKey, () => loadDraft(spec));
  return (
    <DocumentEditorLayout
      title={title}
      subtitle={subtitle}
      sheet={sheet(draft.value)}
      form={form(draft)}
      saved={draft.saved}
      exportFileName={`${filePrefix}-${fileStamp(fileNumber(draft.value))}.json`}
      onExport={() => exportDraft(spec, draft.value)}
      onImport={(text) => {
        const result = importDraft(spec, text);
        if (!result.ok) return result.error;
        draft.replace(result.data);
        return null;
      }}
      onReset={() => {
        clearDraft(spec.storageKey);
        draft.replace(spec.defaults());
      }}
    />
  );
};
