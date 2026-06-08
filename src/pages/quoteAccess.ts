import { User } from '@/contexts/AuthContext';

const KOREA_NATIONALITY_VALUES = new Set(['KR', 'KOREA', 'SOUTH KOREA', '대한민국', '한국']);

export function isKoreanNationality(nationality?: string | null): boolean {
  if (!nationality) return false;
  return KOREA_NATIONALITY_VALUES.has(nationality.trim().toUpperCase());
}

export function getQuoteAccessFlags(user: Pick<User, 'role' | 'nationality'> | null | undefined, isPublic: boolean) {
  const isAdmin = user?.role === 'admin';

  return {
    isAdmin,
    hideMargin: isPublic || !isAdmin,
    isKorean: isKoreanNationality(user?.nationality),
  };
}
