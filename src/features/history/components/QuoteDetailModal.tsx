import React, { useState } from 'react';
import * as Sentry from '@sentry/browser';
import { QuoteDetail, QuoteStatus } from '@/types';
import {
  X,
  Package,
  DollarSign,
  TrendingUp,
  Copy,
  Mail,
  Loader2,
  Link2,
  MessageCircle,
} from 'lucide-react';
import { formatNum } from '@/lib/format';
import { updateQuoteStatus, sendQuoteEmail } from '@/api/quoteApi';
import { createShareLink } from '@/api/shareApi';
import { STATUS_COLORS } from '../constants';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { showNewMessage } from '@/lib/intercom';
import { isLowMargin } from '@/config/business-rules';
import { LowMarginBadge } from './QuoteHistoryTableParts';
import { MetricCard, Section, Field } from './QuoteDetailSubcomponents';
import { QuoteCargoTable } from './QuoteCargoTable';
import { QuoteCostBreakdown } from './QuoteCostBreakdown';

interface Props {
  quote: QuoteDetail;
  onClose: () => void;
  /** Margin and cost are admin-only; the API omits them for members. */
  hideMargin?: boolean;
  onDuplicate?: (quote: QuoteDetail) => void;
  onStatusChange?: (id: number, newStatus: QuoteStatus) => void;
}

const STATUS_FLOW: QuoteStatus[] = [
  'draft',
  'sent',
  'confirmed',
  'accepted',
  'rejected',
  'expired',
];

export const QuoteDetailModal: React.FC<Props> = ({
  quote,
  onClose,
  hideMargin = true,
  onDuplicate,
  onStatusChange,
}) => {
  const fmt = formatNum;
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus>(quote.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailName, setEmailName] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const statusLabel = (s: QuoteStatus) => t(`quote.status.${s}`);

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    setEmailSending(true);
    try {
      await sendQuoteEmail(quote.id, emailTo, emailName || undefined, emailMsg || undefined);
      setEmailSent(true);
      setCurrentStatus('sent');
      onStatusChange?.(quote.id, 'sent');
      toast('success', t('history.toast.emailSent').replace('{email}', emailTo));
      setTimeout(() => {
        setShowEmailForm(false);
        setEmailSent(false);
      }, 2000);
    } catch (e) {
      Sentry.captureException(e);
      toast('error', t('history.toast.emailFailed'));
    } finally {
      setEmailSending(false);
    }
  };

  const handleAskAboutQuote = () => {
    // Pre-fill the Intercom composer with the quote reference so the
    // operator instantly has context — no copy/paste from the partner.
    // Stays English on purpose: it is read by our operators, not the user.
    const carrierLabel = quote.overseasCarrier ?? 'express';
    const prefill =
      `Hi — I have a question about quote ${quote.referenceNo} ` +
      `(${quote.destinationCountry}, ${carrierLabel}). `;
    showNewMessage(prefill);
  };

  const handleShareLink = async () => {
    setShareLoading(true);
    try {
      const { shareUrl } = await createShareLink(quote.id);
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      toast('success', t('history.toast.shareCopied'));
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      Sentry.captureException(e);
      toast('error', t('history.toast.shareFailed'));
    } finally {
      setShareLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (newStatus === currentStatus) return;
    setIsUpdating(true);
    try {
      await updateQuoteStatus(quote.id, newStatus);
      setCurrentStatus(newStatus);
      onStatusChange?.(quote.id, newStatus);
      toast('info', t('history.toast.statusUpdated').replace('{status}', statusLabel(newStatus)));
    } catch (e) {
      Sentry.captureException(e);
      toast('error', t('history.toast.statusFailed'));
    } finally {
      setIsUpdating(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      role='dialog'
      aria-modal='true'
      aria-labelledby='modal-title'
    >
      {/* Backdrop */}
      <div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />

      {/* Modal */}
      <div className='relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl'>
        {/* Header */}
        <div className='sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-xl'>
          <div>
            <h3 id='modal-title' className='text-lg font-bold text-gray-900 dark:text-white'>
              {quote.referenceNo}
            </h3>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 mt-1'>
              <p className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                {t('history.detail.created').replace(
                  '{date}',
                  new Date(quote.createdAt).toLocaleString('ko-KR'),
                )}
              </p>
              <div className='flex flex-wrap items-center gap-1'>
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={isUpdating}
                    aria-label={t('history.detail.setStatus').replace('{status}', statusLabel(s))}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap transition-all ${
                      s === currentStatus
                        ? `${STATUS_COLORS[s]} ring-1 ring-current`
                        : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <button
              onClick={handleAskAboutQuote}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 dark:text-violet-400 dark:hover:text-violet-300 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 transition-colors'
              aria-label={t('history.detail.askLabel')}
              title={t('history.detail.askTitle')}
            >
              <MessageCircle className='w-3.5 h-3.5' />
              {t('history.detail.ask')}
            </button>
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg text-brand-blue-600 hover:text-brand-blue-700 bg-brand-blue-50 hover:bg-brand-blue-100 dark:text-brand-blue-400 dark:hover:text-brand-blue-300 dark:bg-brand-blue-900/30 dark:hover:bg-brand-blue-900/50 transition-colors'
              aria-label={t('history.detail.emailLabel')}
            >
              <Mail className='w-3.5 h-3.5' />
              {t('history.detail.email')}
            </button>
            <button
              onClick={handleShareLink}
              disabled={shareLoading}
              className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50'
              aria-label={t('history.detail.shareLabel')}
            >
              {shareLoading ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Link2 className='w-3.5 h-3.5' />
              )}
              {shareCopied ? t('history.detail.shareCopied') : t('history.detail.share')}
            </button>
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(quote)}
                className='flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg text-brand-blue-600 hover:text-brand-blue-700 bg-brand-blue-50 hover:bg-brand-blue-100 dark:text-brand-blue-400 dark:hover:text-brand-blue-300 dark:bg-brand-blue-900/30 dark:hover:bg-brand-blue-900/50 transition-colors'
                aria-label={t('history.detail.duplicateLabel')}
              >
                <Copy className='w-3.5 h-3.5' />
                {t('history.detail.duplicate')}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label={t('history.detail.close')}
              className='p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        <div className='px-6 py-5 space-y-6'>
          {/* Email Form */}
          {showEmailForm && (
            <div className='bg-brand-blue-50 dark:bg-brand-blue-900/20 rounded-xl p-4 space-y-2 border border-brand-blue-200 dark:border-brand-blue-800'>
              <div className='grid grid-cols-2 gap-2'>
                <input
                  type='email'
                  required
                  placeholder={t('history.email.to')}
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className='px-2.5 py-1.5 text-xs rounded border border-brand-blue-200 dark:border-brand-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                />
                <input
                  placeholder={t('history.email.name')}
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  className='px-2.5 py-1.5 text-xs rounded border border-brand-blue-200 dark:border-brand-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                />
              </div>
              <input
                placeholder={t('history.email.message')}
                value={emailMsg}
                onChange={(e) => setEmailMsg(e.target.value)}
                className='w-full px-2.5 py-1.5 text-xs rounded border border-brand-blue-200 dark:border-brand-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
              />
              <div className='flex justify-end'>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailTo.trim() || emailSent}
                  className='flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-brand-blue-600 rounded-lg hover:bg-brand-blue-700 disabled:opacity-50 transition-colors'
                >
                  {emailSending ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Mail className='w-3 h-3' />
                  )}
                  {emailSent ? t('history.email.sent') : t('history.email.send')}
                </button>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <MetricCard
              icon={<DollarSign className='w-4 h-4 text-brand-blue-500' />}
              label={t('history.metric.amount')}
              value={`${fmt(quote.totalQuoteAmount)} KRW`}
            />
            <MetricCard
              icon={<DollarSign className='w-4 h-4 text-brand-blue-500' />}
              label='USD'
              value={`$${quote.totalQuoteAmountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
            {/* The detail view carried no low-margin signal at all — a saved quote
                below the approval threshold read exactly like a healthy one.
                Admin only: the API omits profitMargin for members entirely. */}
            {!hideMargin && quote.profitMargin !== undefined && (
            <MetricCard
              icon={
                <TrendingUp
                  className={`w-4 h-4 ${
                    isLowMargin(quote.profitMargin) ? 'text-amber-500' : 'text-green-500'
                  }`}
                />
              }
              label={t('history.col.margin')}
              value={
                <span className='inline-flex items-center gap-1.5'>
                  {quote.profitMargin.toFixed(1)}%
                  {isLowMargin(quote.profitMargin) && <LowMarginBadge />}
                </span>
              }
            />
            )}
            <MetricCard
              icon={<Package className='w-4 h-4 text-amber-500' />}
              label={t('history.metric.billableWt')}
              value={`${quote.billableWeight.toFixed(1)} kg`}
            />
          </div>

          {/* Route & Service */}
          <Section title={t('history.section.route')}>
            <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm'>
              <Field label={t('history.field.origin')} value={quote.originCountry} />
              <Field
                label={t('history.field.destination')}
                value={`${quote.destinationCountry} ${quote.destinationZip || ''}`}
              />
              <Field
                label={t('history.field.shippingMode')}
                value={quote.incoterm === 'DAP' ? 'Door-to-Door' : quote.incoterm}
              />
              <Field label={t('history.field.packing')} value={quote.packingType} />
              <Field label={t('history.field.zone')} value={quote.appliedZone || '-'} />
              <Field
                label={t('history.field.exchangeRate')}
                value={`${quote.exchangeRate.toLocaleString()} KRW/USD`}
              />
              <Field label='FSC' value={`${quote.fscPercent}%`} />
              <Field
                label={t('history.field.validity')}
                value={
                  quote.validityDate
                    ? new Date(quote.validityDate).toLocaleDateString('ko-KR')
                    : '-'
                }
              />
            </div>
          </Section>

          {/* Cargo Items */}
          <QuoteCargoTable items={quote.items} />

          {/* Cost Breakdown */}
          {/* The whole stack is internal cost and ends in Total Cost, which
              against totalQuoteAmount yields the margin by arithmetic. */}
          {!hideMargin && quote.breakdown && (
            <QuoteCostBreakdown breakdown={quote.breakdown} />
          )}

          {/* Warnings */}
          {quote.warnings && quote.warnings.length > 0 && (
            <Section title={t('history.section.warnings')}>
              <ul className='space-y-1'>
                {quote.warnings.map((w, i) => (
                  <li
                    key={i}
                    className='text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2'
                  >
                    <span className='shrink-0 mt-0.5'>⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Notes */}
          {quote.notes && (
            <Section title={t('history.section.notes')}>
              <p className='text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap'>
                {quote.notes}
              </p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};
