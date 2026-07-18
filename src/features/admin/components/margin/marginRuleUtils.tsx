import React from 'react';
import { User, Globe, Weight } from 'lucide-react';
import type { MarginRule } from '@/api/marginRuleApi';
import { getCountryDisplayName } from '@/config/options';

export const EMPTY_FORM: Partial<MarginRule> = {
  name: '',
  ruleType: 'weight_based',
  priority: 50,
  matchEmail: null,
  matchNationality: null,
  weightMin: null,
  weightMax: null,
  marginPercent: 19,
};

export function priorityLabel(p: number) {
  if (p >= 100) return 'Per-User Flat';
  if (p >= 90) return 'Per-User Weight-Based';
  if (p >= 50) return 'Nationality';
  return 'Default';
}

export function priorityColor(p: number) {
  if (p >= 100) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
    };
  }
  if (p >= 90) {
    return {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-500',
    };
  }
  if (p >= 50) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-500',
    };
  }
  return {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-500',
  };
}

export function PriorityIcon({ priority }: { priority: number }) {
  if (priority >= 100) return <User className="w-3.5 h-3.5" />;
  if (priority >= 50) return <Globe className="w-3.5 h-3.5" />;
  return <Weight className="w-3.5 h-3.5" />;
}

export function conditionLabel(rule: MarginRule): string {
  const parts: string[] = [];
  if (rule.matchEmail) parts.push(rule.matchEmail);
  if (rule.matchNationality) parts.push(getCountryDisplayName(rule.matchNationality));
  if (rule.weightMin !== null && rule.weightMax !== null) {
    parts.push(`${rule.weightMin}–${rule.weightMax}kg`);
  } else if (rule.weightMin !== null) {
    parts.push(`≥ ${rule.weightMin}kg`);
  } else if (rule.weightMax !== null) {
    parts.push(`< ${rule.weightMax}kg`);
  }
  if (rule.ruleType === 'flat') parts.push('All weights');
  return parts.join(' · ') || 'All';
}
