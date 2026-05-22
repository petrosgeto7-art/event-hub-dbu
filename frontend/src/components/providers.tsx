'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import axios from 'axios';

function ThemeInitializer() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return null;
}

function AuthBootstrap() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    // Silently refresh the access token on app startup
    axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/refresh`,
      {},
      { withCredentials: true }
    ).then((res) => {
      const { accessToken } = res.data.data;
      useAuthStore.getState().setAccessToken(accessToken);
    }).catch(() => {
      // Refresh cookie expired — the stored token will be used as-is.
      // If it's also expired, the API interceptor will handle it.
    });
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInitializer />
      <AuthBootstrap />
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
