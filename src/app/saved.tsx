import { router } from 'expo-router';

import { SavedScreen } from '@/screens/SavedScreen';
import { useSession } from '@/context/session';

export default function SavedRoute() {
  const { savedIds, toggleSave } = useSession();

  return (
    <SavedScreen
      savedIds={savedIds}
      onBack={() => router.back()}
      onNavigateToDetail={(id) => router.push({ pathname: '/cafe/[id]', params: { id } })}
      onToggleSave={toggleSave}
      onBrowse={() => router.replace('/map')}
    />
  );
}
