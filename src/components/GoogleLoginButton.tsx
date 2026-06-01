import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../lib/authStore';

declare global {
  interface Window {
    google?: any;
    __gsiLoaded?: boolean;
  }
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

const loadGsi = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.id) return resolve();
    if (document.getElementById('google-gsi-script')) {
      const wait = () => {
        if (window.google?.accounts?.id) resolve();
        else setTimeout(wait, 50);
      };
      wait();
      return;
    }
    const s = document.createElement('script');
    s.id = 'google-gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // don't reject — we'll show fallback
    document.head.appendChild(s);
  });
};

interface Props {
  onError?: (msg: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  label?: string;
  className?: string;
}

const GoogleLoginButton: React.FC<Props> = ({ onError, text = 'continue_with', label = 'Continue with Google', className = '' }) => {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [sdkFailed, setSdkFailed] = useState(false);
  const { googleLogin } = useAuthStore();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) { setSdkFailed(true); return; }
    let mounted = true;
    loadGsi().then(() => {
      if (!mounted) return;
      if (!window.google?.accounts?.id) { setSdkFailed(true); return; }
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (resp: any) => {
            try {
              if (resp?.credential) {
                await googleLogin(resp.credential);
                // The auth store will update; AuthLayout/ProtectedRoute will route.
                // Also do a hard navigate in case state subscriptions are missed:
                const role = useAuthStore.getState().user?.role;
                if (role === 'SUPER_ADMIN') window.location.href = '/admin';
                else window.location.href = '/dashboard';
              } else {
                onError?.('No credential returned from Google');
              }
            } catch (e: any) {
              onError?.(e?.message || 'Google sign-in failed');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        if (btnRef.current) {
          window.google.accounts.id.renderButton(btnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });
        }
        setReady(true);
      } catch (e) {
        setSdkFailed(true);
      }
    });
    return () => { mounted = false; };
  }, [googleLogin, onError, text]);

  const handleFallback = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      onError?.('Google sign-in not configured. Please use email sign-up.');
      return;
    }
    if (window.google?.accounts?.id?.prompt) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        onError?.('Google sign-in is temporarily unavailable. Please use email.');
      }
    } else {
      onError?.('Google sign-in is temporarily unavailable. Please use email.');
    }
  }, [onError]);

  if (sdkFailed || !GOOGLE_CLIENT_ID) {
    return (
      <button
        type="button"
        onClick={handleFallback}
        className={`flex items-center justify-center gap-2.5 w-full max-w-[320px] h-11 px-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all text-sm font-medium text-gray-700 ${className}`}
      >
        <GoogleGIcon />
        {label}
      </button>
    );
  }

  return (
    <div className={`flex justify-center w-full ${className}`}>
      <div
        ref={btnRef}
        className="w-full max-w-[320px] h-11 flex items-center justify-center"
        style={{ minHeight: 44, opacity: ready ? 1 : 0.6 }}
      >
        {!ready && (
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2.5 w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-400"
          >
            <GoogleGIcon />
            {label}
          </button>
        )}
      </div>
    </div>
  );
};

const GoogleGIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

export default GoogleLoginButton;
