import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '@/context/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const PROTECTED_ROUTES = ['/cart', '/orders', '/wishlist', '/profile'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, pendingRoute, setPendingRoute } = useApp() as any;
  const pathname = usePathname();
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (!user) return;
    const isProtected = PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
    if (isProtected && !user.isLoggedIn) {
      if (!checked.current || pendingRoute !== pathname) {
        setPendingRoute(pathname);
        checked.current = true;
        router.replace('/login');
      }
    } else if (pathname === '/login' && user.isLoggedIn) {
      checked.current = false;
      const dest = pendingRoute || '/';
      setPendingRoute(null);
      router.replace(dest as any);
    }
  }, [pathname, user?.isLoggedIn]);

  return <>{children}</>;
}

function RootNavigation() {
  const { isDarkMode } = useApp();
  const bg = isDarkMode ? '#121212' : '#F8F7F3';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthGate>
          <RootNavigation />
        </AuthGate>
      </AppProvider>
    </ErrorBoundary>
  );
}
