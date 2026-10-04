import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Globe, Moon, Sun, LogOut, Menu, X, BookOpen } from 'lucide-react';
import { AccountSettingsModal } from '@/features/dashboard/components/AccountSettingsModal';
import { AccountMenu } from './AccountMenu';
import { markSignedOut } from '@/pages/loginRedirect';

const LANGUAGES = [
  { code: 'en' as const, label: 'English', flag: '🇺🇸' },
  { code: 'ko' as const, label: '한국어', flag: '🇰🇷' },
  { code: 'ja' as const, label: '日本語', flag: '🇯🇵' },
  { code: 'cn' as const, label: '中文', flag: '🇨🇳' },
];

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || user?.email.split('@')[0] || '';

  // The "signed out" notice is a sessionStorage flag, not router state: a
  // ProtectedRoute still mounted during the navigation transition redirects on
  // its own once `user` turns null and would overwrite any state we pass (see
  // loginRedirect.ts). `replace` drops the protected page from history — Back
  // would only bounce through ProtectedRoute again.
  const handleLogout = async () => {
    markSignedOut();
    navigate('/login', { replace: true });
    await logout();
  };

  return (
    <>
      <header className='sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 transition-colors duration-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16 items-center'>
            <div className='flex-shrink-0 flex items-center'>
              <Link to='/' className='flex items-center'>
                <span className='text-xl font-bold text-gray-900 dark:text-white tracking-tight'>
                  {t('nav.smartQuote')}
                </span>
              </Link>
            </div>

            <div className='flex items-center space-x-2 sm:space-x-4'>
              {/* Desktop Auth Buttons */}
              {isAuthenticated ? (
                <div className='hidden sm:flex items-center space-x-3'>
                  {user?.role === 'admin' && (
                    <Link
                      to='/admin'
                      className='text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-white bg-cyan-50 dark:bg-gray-900 px-3 py-1.5 rounded-md transition-colors'
                    >
                      {t('nav.admin')}
                    </Link>
                  )}

                  <Link
                    to='/dashboard'
                    className='text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-white transition-colors'
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    to='/guide'
                    className='text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-white transition-colors flex items-center gap-1'
                  >
                    <BookOpen className='w-4 h-4' />
                    {t('nav.guide')}
                  </Link>
                </div>
              ) : (
                <div className='hidden sm:flex space-x-2 items-center'>
                  <Link
                    to='/login'
                    className='text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors'
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to='/signup'
                    className='bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-2 sm:px-4 rounded-md text-sm font-medium shadow-sm transition-colors'
                  >
                    {t('nav.signup')}
                  </Link>
                  <Link
                    to='/guide'
                    className='text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1'
                  >
                    <BookOpen className='w-4 h-4' />
                    {t('nav.guide')}
                  </Link>
                </div>
              )}

              {/* Language Dropdown — Admin only */}
              {user?.role === 'admin' && (
                <div ref={langRef} className='relative'>
                  <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsLangOpen(false);
                      if (e.key === 'ArrowDown' && !isLangOpen) {
                        e.preventDefault();
                        setIsLangOpen(true);
                      }
                    }}
                    className='p-2 text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center space-x-1 transition-all'
                    aria-label='Select language'
                    aria-expanded={isLangOpen}
                    aria-haspopup='listbox'
                  >
                    <Globe className='w-5 h-5' />
                    <span className='text-sm font-medium uppercase'>{language}</span>
                  </button>
                  {isLangOpen && (
                    <div
                      className='absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1'
                      role='listbox'
                    >
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          role='option'
                          aria-selected={language === lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setIsLangOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${language === lang.code ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className='p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all'
                aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
              </button>

              {/* Account menu — settings + logout live here on desktop */}
              {isAuthenticated && user && (
                <div className='hidden sm:block'>
                  <AccountMenu
                    name={displayName}
                    email={user.email}
                    userRole={user.role}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onLogout={handleLogout}
                  />
                </div>
              )}

              {/* Mobile Hamburger. 44px is pinned as an explicit min size, not
                  extra padding, so it survives an icon-size change: p-2 around a
                  20px icon left this at 36x36, and on a phone this button is the
                  only way to reach navigation at all. */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='sm:hidden p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all'
                aria-label='Toggle menu'
              >
                {isMobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className='sm:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2 bg-white dark:bg-gray-950'>
            {isAuthenticated ? (
              <>
                <div className='pb-2 mb-2 border-b border-gray-200 dark:border-gray-800'>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>{displayName}</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>{user?.email}</p>
                  <p className='text-xs text-brand-blue-600 dark:text-brand-blue-300 font-semibold uppercase tracking-wider'>
                    {user?.role}
                  </p>
                </div>
                <Link
                  to='/dashboard'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='block py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                >
                  {t('nav.dashboard')}
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to='/admin'
                    onClick={() => setIsMobileMenuOpen(false)}
                    className='block py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                  >
                    {t('nav.admin')}
                  </Link>
                )}

                <Link
                  to='/guide'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-1.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                >
                  <BookOpen className='w-4 h-4' />
                  {t('nav.guide')}
                </Link>
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className='block w-full text-left py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                >
                  {t('settings.account.title')}
                </button>
                <div className='pt-2 mt-2 border-t border-gray-200 dark:border-gray-800'>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      void handleLogout();
                    }}
                    className='flex w-full items-center gap-2 min-h-[44px] text-left text-sm font-medium text-destructive-700 dark:text-destructive-300 hover:text-destructive-800 dark:hover:text-destructive-200'
                  >
                    <LogOut aria-hidden='true' className='w-4 h-4' />
                    {t('nav.logout')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to='/login'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='block py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to='/signup'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='block py-2 text-sm font-medium text-cyan-600'
                >
                  {t('nav.signup')}
                </Link>
                <Link
                  to='/guide'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-1.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-cyan-600'
                >
                  <BookOpen className='w-4 h-4' />
                  {t('nav.guide')}
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Account Settings Modal */}
      {isAuthenticated && (
        <AccountSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
};
