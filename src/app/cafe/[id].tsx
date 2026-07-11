import { router, useLocalSearchParams } from 'expo-router';

import { CafeDetailScreen } from '@/screens/CafeDetailScreen';
import { useSession } from '@/context/session';

export default function CafeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoggedIn, isSaved, toggleSave } = useSession();

  return (
    <CafeDetailScreen
      cafeId={id ?? null}
      isErrorState={id === 'error'}
      isLoggedIn={isLoggedIn}
      isSaved={isSaved(id ?? '')}
      onBack={() => router.back()}
      onToggleSave={() => id && toggleSave(id)}
      onLoginRequest={() => router.push('/login')}
    />
  );
}
