import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </AuthGuard>
  );
}
