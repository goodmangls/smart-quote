import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedQuote, SharedQuoteData } from '@/api/shareApi';
import { COUNTRY_OPTIONS, ORIGIN_COUNTRY_OPTIONS } from '@/config/options';
import { AlertTriangle, Plane } from 'lucide-react';

// Public page a partner opens from a share link. Styled as a document — a paper
// card on a neutral background (DESIGN.md §8.9; Mobbin: Midday, Xero, Bonsai) —
// rather than an app screen. Copy stays English on purpose: the audience is
// external partners. Only fields in QuoteSerializer.shared exist here.

const SHARE_PRIMARY_LINK_CLASS =
  'inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';

const Wordmark: React.FC = () => (
  <Link
    to='/'
    className='text-base font-semibold tracking-tight text-gray-900 dark:text-white focus:outline-none focus-visible:underline'
  >
    BridgeLogis
  </Link>
);

const Field: React.FC<{ label: string; children: React.ReactNode; align?: 'left' | 'right' }> = ({
  label,
  children,
  align = 'left',
}) => (
  <div className={align === 'right' ? 'text-right' : undefined}>
    <dt className='text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'>
      {label}
    </dt>
    <dd className='mt-1 text-sm font-semibold text-gray-900 dark:text-white'>{children}</dd>
  </div>
);

const SharedQuotePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getSharedQuote(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Origins and destinations are separate lists: Korea is only ever an origin,
  // so a destination-only lookup printed the origin as the bare code "KR".
  const countryName = (code: string, options = COUNTRY_OPTIONS) =>
    options.find((c) => c.code === code)
      ?.name?.replace(/[^\x20-\x7E]/g, '')
      .trim() || code;

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950'>
        <div role='status' aria-label='Loading quote'>
          <div className='w-8 h-8 rounded-full border-2 border-gray-300 border-t-brand-blue dark:border-gray-700 dark:border-t-brand-blue-300 animate-spin motion-reduce:animate-none' />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4'>
        <div className='max-w-md w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-8 text-center'>
          <span className='mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive-50 text-destructive-600 ring-1 ring-destructive-200 dark:bg-destructive-900/20 dark:text-destructive-300 dark:ring-destructive-800'>
            <AlertTriangle aria-hidden='true' className='h-6 w-6' />
          </span>
          <h1 className='mt-5 text-xl font-semibold text-gray-900 dark:text-white'>
            Quote Unavailable
          </h1>
          <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
            {error || 'This share link is invalid or has expired.'}
          </p>
          <Link to='/' className={`mt-6 ${SHARE_PRIMARY_LINK_CLASS}`}>
            Go to BridgeLogis
          </Link>
        </div>
      </div>
    );
  }

  const isUsd = true; // Shared quotes always show USD for external partners
  const totalDisplay = isUsd
    ? `$${data.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : `KRW ${data.totalQuoteAmount.toLocaleString('en-US')}`;
  const secondaryDisplay = isUsd
    ? `KRW ${data.totalQuoteAmount.toLocaleString('en-US')}`
    : `$${data.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className='min-h-screen bg-gray-100 dark:bg-gray-950 px-4 py-8 sm:py-12'>
      <div className='mx-auto max-w-3xl'>
        <div className='flex items-center justify-between mb-4'>
          <Wordmark />
          <span className='text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'>
            Freight Quotation
          </span>
        </div>

        <article className='rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden'>
          {/* Head: reference + dates */}
          <header className='px-6 sm:px-8 pt-6 sm:pt-8 pb-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <p className='text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'>
                Quotation
              </p>
              <h1 className='mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums'>
                {data.referenceNo}
              </h1>
            </div>
            <dl className='grid grid-cols-2 gap-x-8 gap-y-3 sm:text-right'>
              <Field label='Issued'>{new Date(data.createdAt).toLocaleDateString('en-US')}</Field>
              {data.validityDate && (
                <Field label='Valid until'>
                  {new Date(data.validityDate).toLocaleDateString('en-US')}
                </Field>
              )}
            </dl>
          </header>

          {/* Route */}
          <div className='mx-6 sm:mx-8 flex items-center gap-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-4 py-4'>
            <dl className='flex-1 min-w-0'>
              <Field label='Origin'>{countryName(data.originCountry, ORIGIN_COUNTRY_OPTIONS)}</Field>
            </dl>
            <div
              className='flex items-center gap-2 text-gray-400 dark:text-gray-500'
              aria-hidden='true'
            >
              <div className='w-6 sm:w-10 h-px bg-gray-300 dark:bg-gray-700' />
              <Plane className='w-4 h-4' />
              <div className='w-6 sm:w-10 h-px bg-gray-300 dark:bg-gray-700' />
            </div>
            <dl className='flex-1 min-w-0'>
              <Field label='Destination' align='right'>
                {countryName(data.destinationCountry)}
                {data.destinationZip ? ` (${data.destinationZip})` : ''}
              </Field>
            </dl>
          </div>

          {/* Details */}
          <dl className='px-6 sm:px-8 py-6 grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-5'>
            <Field label='Carrier'>{data.overseasCarrier}</Field>
            <Field label='Zone'>{data.appliedZone}</Field>
            <Field label='Transit'>{data.transitTime}</Field>
            <Field label='Incoterm'>{data.incoterm}</Field>
            <Field label='Billable Weight'>
              <span className='tabular-nums'>{data.billableWeight} kg</span>
            </Field>
          </dl>

          {/* Total */}
          <div className='mx-6 sm:mx-8 border-t border-gray-200 dark:border-gray-800 py-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
            <p className='text-sm font-semibold text-gray-700 dark:text-gray-300'>Total Quote</p>
            <div className='sm:text-right'>
              <p className='text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white tabular-nums'>
                {totalDisplay}
              </p>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400 tabular-nums'>
                Approx. {secondaryDisplay}
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <footer className='px-6 sm:px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400'>
            This quotation is valid within the stated period. Surcharges are subject to change at
            time of booking.
          </footer>
        </article>

        <p className='mt-6 text-center text-xs text-gray-500 dark:text-gray-400'>
          Powered by{' '}
          <Link
            to='/'
            className='font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white focus:outline-none focus-visible:underline'
          >
            BridgeLogis
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SharedQuotePage;
