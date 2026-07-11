import { router } from 'expo-router';

import { PreferenceSetup } from '@/screens/PreferenceSetup';
import { useSession } from '@/context/session';

export default function PreferencesRoute() {
  const { login } = useSession();

  const start = () => {
    login();
    router.replace('/map');
  };

  return <PreferenceSetup onStart={start} onSkip={start} />;
}
