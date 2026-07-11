import { useEffect } from 'react';
import { router } from 'expo-router';

import { SplashScreen as SplashView } from '@/screens/SplashScreen';

export default function Splash() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 1800);
    return () => clearTimeout(t);
  }, []);

  return <SplashView />;
}
