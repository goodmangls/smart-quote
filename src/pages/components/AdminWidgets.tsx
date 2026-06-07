import React from 'react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Building2, Percent, AlertTriangle, Table2, UserCog, ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CustomerManagement = React.lazy(() => import('@/features/admin/components/CustomerManagement').then(m => ({ default: m.CustomerManagement })));
const RateTableViewer = React.lazy(() => import('@/features/admin/components/RateTableViewer').then(m => ({ default: m.RateTableViewer })));
const UserManagementWidget = React.lazy(() => import('@/features/admin/components/UserManagementWidget').then(m => ({ default: m.UserManagementWidget })));
const AuditLogViewer = React.lazy(() => import('@/features/admin/components/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const TargetMarginRulesWidget = React.lazy(() => import('@/features/admin/components/TargetMarginRulesWidget').then(m => ({ default: m.TargetMarginRulesWidget })));
const SurchargeManagementWidget = React.lazy(() => import('@/features/admin/components/SurchargeManagementWidget').then(m => ({ default: m.SurchargeManagementWidget })));

export const AdminWidgets: React.FC = () => {
  const { t } = useLanguage();

  return (
    <React.Suspense fallback={<div className="mt-8 space-y-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>}>
      <div className="mt-8 space-y-4">
        <CollapsibleSection title={t('admin.customerManagementTitle')} icon={<Building2 className="w-4 h-4 text-brand-blue-500" />}>
          <CustomerManagement />
        </CollapsibleSection>
        <CollapsibleSection title={t('admin.targetMarginRulesTitle')} icon={<Percent className="w-4 h-4 text-brand-blue-500" />}>
          <TargetMarginRulesWidget />
        </CollapsibleSection>
        <CollapsibleSection title={t('admin.surchargeManagementTitle')} icon={<AlertTriangle className="w-4 h-4 text-brand-blue-500" />}>
          <SurchargeManagementWidget />
        </CollapsibleSection>
        <CollapsibleSection title={t('admin.rateTablesTitle')} icon={<Table2 className="w-4 h-4 text-brand-blue-500" />}>
          <RateTableViewer />
        </CollapsibleSection>
        <CollapsibleSection title={t('admin.userManagementTitle')} icon={<UserCog className="w-4 h-4 text-brand-blue-500" />}>
          <UserManagementWidget />
        </CollapsibleSection>
        <CollapsibleSection title={t('admin.auditLogTitle')} icon={<ClipboardList className="w-4 h-4 text-brand-blue-500" />}>
          <AuditLogViewer />
        </CollapsibleSection>
      </div>
    </React.Suspense>
  );
};
