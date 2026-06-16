import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function SignupPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <SignupForm />
      </AuthLayout>
    </AuthGuard>
  );
}
