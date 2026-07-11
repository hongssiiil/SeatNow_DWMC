import { router } from 'expo-router';

import { SignUp } from '@/screens/SignUp';

export default function SignUpRoute() {
  return (
    <SignUp
      onBack={() => router.back()}
      onSuccess={() => router.replace('/preferences')}
      onLogin={() => router.replace('/email-login')}
    />
  );
}
