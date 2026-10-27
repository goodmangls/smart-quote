import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { EDITORS } from '@/features/documents/components/editors';
import { isDocumentType } from '@/features/documents/types';

const DocumentEditorPage = () => {
  const { type } = useParams();
  if (!isDocumentType(type)) return <Navigate to='/documents' replace />;
  const Editor = EDITORS[type];

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <div className='print:hidden'>
        <Header />
      </div>
      {/* Keyed so switching tabs mounts fresh and re-reads a shared draft. */}
      <Editor key={type} />
    </div>
  );
};

export default DocumentEditorPage;
