import React from 'react';
import { QuoteDetail } from '@/types';
import { Section } from './QuoteDetailSubcomponents';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  items: QuoteDetail['items'];
}

export const QuoteCargoTable: React.FC<Props> = ({ items }) => {
  const { t } = useLanguage();
  return (
    <Section title={t('history.section.cargo')}>
      <div className='overflow-x-auto'>
        <table className='w-full text-xs'>
          <thead>
            <tr className='text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700'>
              <th className='text-left py-2 pr-3'>#</th>
              <th className='text-right py-2 px-2'>W(cm)</th>
              <th className='text-right py-2 px-2'>L(cm)</th>
              <th className='text-right py-2 px-2'>H(cm)</th>
              <th className='text-right py-2 px-2'>Wt(kg)</th>
              <th className='text-right py-2 pl-2'>{t('history.cargo.qty')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={i}
                className='border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300'
              >
                <td className='py-2 pr-3'>{i + 1}</td>
                <td className='text-right py-2 px-2'>{item.width}</td>
                <td className='text-right py-2 px-2'>{item.length}</td>
                <td className='text-right py-2 px-2'>{item.height}</td>
                <td className='text-right py-2 px-2'>{item.weight}</td>
                <td className='text-right py-2 pl-2'>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
};
