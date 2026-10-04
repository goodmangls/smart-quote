import React, { useState } from 'react';
import * as Sentry from '@sentry/browser';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ChevronDown, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthLayout, ErrorAlert } from '../components/auth/AuthLayout';
import {
  authFieldIconClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
  authTextLinkClass,
} from '../components/auth/authStyles';
import { NATIONALITY_OPTIONS } from '../config/options';

// Same shell and field styles as LoginPage (DESIGN.md §8.8), so moving between
// the two pages changes only the form, not the surroundings. Mobbin: Base44,
// Lindy, Greptile (split sign-up), Grok (paired fields on one row).
export const SignUpPage: React.FC = () => {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsNotMatch'));
      return;
    }

    if (email.trim() && password.trim() && name.trim() && nationality.trim()) {
      setIsLoading(true);
      try {
        const result = await signup(
          email.trim(),
          password.trim(),
          company.trim(),
          name.trim(),
          nationality.trim(),
        );
        if (result.success) {
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error || t('auth.emailExists'));
        }
      } catch (e) {
        Sentry.captureException(e);
        setError(t('auth.emailExists'));
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(t('auth.fillAll'));
    }
  };

  return (
    <AuthLayout>
      <h1 className='mt-8 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white'>
        {t('auth.signupTitle')}
      </h1>
      <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>{t('auth.signupSubtitle')}</p>

      <form className='mt-8 space-y-5' onSubmit={handleSubmit}>
        {error && <ErrorAlert message={error} />}

        <div>
          <label htmlFor='company' className={authLabelClass}>
            {t('auth.company')}{' '}
            <span className='font-normal text-gray-500 dark:text-gray-400'>
              ({t('auth.optional')})
            </span>
          </label>
          <div className='relative'>
            <Building2 aria-hidden='true' className={authFieldIconClass} />
            <input
              id='company'
              name='company'
              type='text'
              autoComplete='organization'
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={`${authInputClass} pl-10 pr-4`}
            />
          </div>
        </div>

        <div className='grid gap-5 sm:grid-cols-2 sm:gap-4'>
          <div>
            <label htmlFor='name' className={authLabelClass}>
              {t('auth.name')}
            </label>
            <div className='relative'>
              <User aria-hidden='true' className={authFieldIconClass} />
              <input
                id='name'
                name='name'
                type='text'
                required
                autoComplete='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${authInputClass} pl-10 pr-4`}
              />
            </div>
          </div>
          <div>
            <label htmlFor='nationality' className={authLabelClass}>
              {t('auth.nationality')}
            </label>
            <div className='relative'>
              <select
                id='nationality'
                name='nationality'
                required
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className={`${authInputClass} pl-3 pr-9 appearance-none`}
              >
                <option value='' disabled>
                  {t('auth.selectNationality')}
                </option>
                {NATIONALITY_OPTIONS.map((country, idx) => (
                  <React.Fragment key={country.code}>
                    {idx === 7 && <option disabled>{'─'.repeat(20)}</option>}
                    <option value={country.code}>{country.name}</option>
                  </React.Fragment>
                ))}
              </select>
              <ChevronDown
                aria-hidden='true'
                className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none'
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor='email' className={authLabelClass}>
            {t('auth.email')}
          </label>
          <div className='relative'>
            <Mail aria-hidden='true' className={authFieldIconClass} />
            <input
              id='email'
              name='email'
              type='email'
              required
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${authInputClass} pl-10 pr-4`}
              placeholder='name@company.com'
            />
          </div>
        </div>

        <div>
          <label htmlFor='password' className={authLabelClass}>
            {t('auth.password')}
          </label>
          <div className='relative'>
            <Lock aria-hidden='true' className={authFieldIconClass} />
            <input
              id='password'
              name='password'
              type='password'
              required
              autoComplete='new-password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pl-10 pr-4`}
            />
          </div>
        </div>

        <div>
          <label htmlFor='confirmPassword' className={authLabelClass}>
            {t('auth.confirmPassword')}
          </label>
          <div className='relative'>
            <Lock aria-hidden='true' className={authFieldIconClass} />
            <input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              required
              autoComplete='new-password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${authInputClass} pl-10 pr-4`}
            />
          </div>
        </div>

        <button type='submit' disabled={isLoading} className={authPrimaryButtonClass}>
          {isLoading ? t('auth.creatingAccount') : t('auth.signup')}
        </button>
      </form>

      <p className='mt-8 text-center text-sm text-gray-500 dark:text-gray-400'>
        {t('auth.haveAccount')}{' '}
        <Link to='/login' className={`font-semibold ${authTextLinkClass}`}>
          {t('nav.login')}
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SignUpPage;
