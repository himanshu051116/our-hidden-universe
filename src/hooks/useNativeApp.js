import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function useNativeApp() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    document.documentElement.classList.add('native-app');
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#05040a' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    SplashScreen.hide().catch(() => {});

    let disposed = false;
    const listeners = [];

    async function register(promise) {
      const listener = await promise;
      if (disposed) {
        await listener.remove().catch(() => {});
        return;
      }
      listeners.push(listener);
    }

    async function addListeners() {
      try {
        await register(CapacitorApp.addListener('backButton', () => {
          if (location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/universe/home') {
            navigate(-1);
            return;
          }
          CapacitorApp.minimizeApp();
        }));
        if (disposed) return;

        await register(CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          try {
            const openedUrl = new URL(url);
            // HTTPS app links already contain a full pathname. Custom schemes
            // such as ohu://universe/chat keep their route in the hostname.
            const webLink = openedUrl.protocol === 'https:' || openedUrl.protocol === 'http:';
            const route = webLink
              ? openedUrl.pathname
              : `/${openedUrl.hostname}${openedUrl.pathname}`;
            if (route && route !== '/') navigate(route + openedUrl.search + openedUrl.hash);
          } catch {
            // Ignore malformed external links.
          }
        }));
        if (disposed) return;

        await register(Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('native-keyboard-open');
        }));
        if (disposed) return;
        await register(Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('native-keyboard-open');
        }));
      } catch {
        // Some platforms do not expose optional native listeners.
      }
    }

    addListeners();

    return () => {
      disposed = true;
      listeners.forEach((listener) => listener.remove().catch(() => {}));
      document.body.classList.remove('native-keyboard-open');
    };
  }, [location.pathname, navigate]);
}
