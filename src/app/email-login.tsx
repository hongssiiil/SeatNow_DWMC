import { router } from 'expo-router';

import { EmailLogin } from '@/screens/EmailLogin';
import { useSession } from '@/context/session';

export default function EmailLoginRoute() {
  const { login } = useSession();

  return (
    <EmailLogin
      onBack={() => router.back()}
      onLogin={() => {
        login();
        router.replace('/map');
      }}
      onSignUp={() => router.push('/sign-up')}
      onGuest={() => router.replace('/map')}
    />
  );
}
