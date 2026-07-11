import { router } from 'expo-router';

import { LoginLanding } from '@/screens/LoginLanding';
import { useSession } from '@/context/session';

export default function LoginRoute() {
  const { login } = useSession();

  const goMap = (loggedIn: boolean) => {
    if (loggedIn) login();
    router.replace('/map');
  };

  return (
    <LoginLanding
      onKakao={() => goMap(true)}
      onApple={() => goMap(true)}
      onEmail={() => router.push('/email-login')}
      onSignUp={() => router.push('/sign-up')}
      onGuest={() => goMap(false)}
    />
  );
}
