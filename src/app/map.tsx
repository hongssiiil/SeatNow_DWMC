import { router } from 'expo-router';

import { MapScreen } from '@/screens/MapScreen';
import { useSession } from '@/context/session';

export default function MapRoute() {
  const { isLoggedIn, savedIds, toggleSave } = useSession();

  return (
    <MapScreen
      isLoggedIn={isLoggedIn}
      savedIds={savedIds}
      onToggleSave={toggleSave}
      onNavigateToDetail={(id) => router.push({ pathname: '/cafe/[id]', params: { id } })}
      onOpenSaved={() => router.push('/saved')}
      onLoginRequest={() => router.push('/login')}
    />
  );
}
