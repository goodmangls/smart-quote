import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { Intercom } from './components/Intercom';

const LandingPage = React.lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const QuoteCalculator = React.lazy(() => import('./pages/QuoteCalculator'));
const CustomerDashboard = React.lazy(() => import('./pages/CustomerDashboard'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const UserGuidePage = React.lazy(() => import('./pages/UserGuidePage'));

const SharedQuotePage = React.lazy(() => import('./pages/SharedQuotePage'));
const MagicLinkVerifyPage = React.lazy(() => import('./pages/MagicLinkVerifyPage'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <Intercom />
                <Suspense
                  fallback={
                    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
                      <div className='w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-brand-blue-500 rounded-full animate-spin' />
                    </div>
                  }
                >
                  <Routes>
                    {/* Public Landing Page */}
                    <Route path='/' element={<LandingPage />} />

                    {/* Authentication Routes */}
                    <Route path='/login' element={<LoginPage />} />
                    <Route path='/signup' element={<SignUpPage />} />
                    <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />

                    {/* Customer Dashboard - Weather, News, Recent Quotes */}
                    <Route
                      path='/dashboard'
                      element={
                        <ProtectedRoute>
                          <ErrorBoundary>
                            <CustomerDashboard />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />

                    {/* Public Quote Calculator (no margin breakdown) */}
                    <Route
                      path='/quote'
                      element={
                        <ProtectedRoute>
                          <ErrorBoundary>
                            <QuoteCalculator isPublic={true} />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />

                    {/* Internal Admin Route - Protected strictly for Admin */}
                    <Route
                      path='/admin'
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <ErrorBoundary>
                            <QuoteCalculator isPublic={false} />
                          </ErrorBoundary>
                        </ProtectedRoute>
                      }
                    />

                    {/* Shared Quote - Public (no auth required) */}
                    <Route path='/q/:token' element={<SharedQuotePage />} />

                    {/* User Guide - Public */}
                    <Route
                      path='/guide'
                      element={
                        <ErrorBoundary>
                          <UserGuidePage />
                        </ErrorBoundary>
                      }
                    />

                    {/* Fallback to home */}
                    <Route path='*' element={<Navigate to='/' replace />} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
