import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { InteractiveDotGrid } from '@/components/ui/InteractiveDotGrid';

// Same navy + dot grid as the landing hero and auth brand panel (DESIGN.md
// §8.8/§8.10) — signing in lands on a page that still looks like the product
// you signed up for. Solid surface; no gradient or blur glows.
export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className='relative overflow-hidden bg-navy rounded-xl p-6 sm:p-8 text-white ring-1 ring-white/5'>
      <InteractiveDotGrid tone='navy' />

      <div className='relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='min-w-0'>
          <h1 className='text-xl sm:text-2xl font-semibold tracking-tight'>
            {t('dashboard.welcome')}, {user?.name || user?.email?.split('@')[0] || 'Guest'}
            {t('dashboard.honorific')}
          </h1>
          <p className='text-sm text-gray-400 mt-1 truncate'>{user?.email}</p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/quote')}
          className='inline-flex items-center gap-2 shrink-0 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy'
        >
          <PlusCircle aria-hidden='true' className='w-4 h-4' />
          {t('dashboard.newQuote')}
        </button>
      </div>
    </div>
  );
};
