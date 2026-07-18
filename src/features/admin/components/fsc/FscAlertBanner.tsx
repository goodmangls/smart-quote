import React from 'react';
import { TriangleAlert } from 'lucide-react';

export const FscAlertBanner: React.FC = () => (
  <div className="mx-4 my-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
    <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
      최근 유류할증료가 급등하고 있습니다. 견적 전 각 Carrier 공식 사이트에서 최신 FSC를 반드시
      확인하세요.
    </p>
  </div>
);
