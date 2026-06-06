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

    let backListener;
    let urlListener;
    let keyboardShowListener;
    let keyboardHideListener;

    async function addListeners() {
      backListener = await CapacitorApp.addListener('backButton', () => {
        if (location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/universe/home') {
          navigate(-1);
          return;
        }
        CapacitorApp.minimizeApp();
      });

      urlListener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        try {
          const openedUrl = new URL(url);
          const route = `${openedUrl.hostname ? `/${openedUrl.hostname}` : ''}${openedUrl.pathname}`;
          if (route && route !== '/') navigate(route);
        } catch {
          // Ignore malformed external links.
        }
      });

      keyboardShowListener = await Keyboard.addListener('keyboardWillShow', () => {
        document.body.classList.add('native-keyboard-open');
      });
      keyboardHideListener = await Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('native-keyboard-open');
      });
    }

    addListeners();

    return () => {
      backListener?.remove();
      urlListener?.remove();
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
      document.body.classList.remove('native-keyboard-open');
    };
  }, [location.pathname, navigate]);
}
