import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminWidgets } from '../AdminWidgets';

let mockUser: { role: 'admin' | 'user' | 'member' } | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'admin.customerManagementTitle': '고객 관리',
        'admin.targetMarginRulesTitle': '목표 마진 규칙',
        'admin.surchargeManagementTitle': '할증료 관리',
        'admin.rateTablesTitle': '운임표',
        'admin.userManagementTitle': '가입 회원 관리',
        'admin.auditLogTitle': '감사 로그',
      })[key] ?? key,
  }),
}));

vi.mock('@/features/admin/components/CustomerManagement', () => ({
  CustomerManagement: () => <div>Customer Management Body</div>,
}));
vi.mock('@/features/admin/components/RateTableViewer', () => ({
  RateTableViewer: () => <div>Rate Table Body</div>,
}));
vi.mock('@/features/admin/components/UserManagementWidget', () => ({
  UserManagementWidget: () => <div>User Management Body</div>,
}));
vi.mock('@/features/admin/components/AuditLogViewer', () => ({
  AuditLogViewer: () => <div>Audit Log Body</div>,
}));
vi.mock('@/features/admin/components/TargetMarginRulesWidget', () => ({
  TargetMarginRulesWidget: () => <div>Margin Rules Body</div>,
}));
vi.mock('@/features/admin/components/SurchargeManagementWidget', () => ({
  SurchargeManagementWidget: () => <div>Surcharge Body</div>,
}));

describe('AdminWidgets role gate', () => {
  const adminOnlyTitles = [
    '고객 관리',
    '목표 마진 규칙',
    '할증료 관리',
    '운임표',
    '가입 회원 관리',
    '감사 로그',
  ];

  it.each([null, { role: 'user' as const }, { role: 'member' as const }])(
    'does not render admin widgets for non-admin user %o',
    (user) => {
      mockUser = user;
      const { container } = render(<AdminWidgets />);

      expect(container).toBeEmptyDOMElement();
      for (const title of adminOnlyTitles) {
        expect(screen.queryByText(title)).not.toBeInTheDocument();
      }
    },
  );

  it('renders admin widgets for admin users', async () => {
    mockUser = { role: 'admin' };
    render(<AdminWidgets />);

    for (const title of adminOnlyTitles) {
      expect(await screen.findByText(title)).toBeInTheDocument();
    }
  });
});
