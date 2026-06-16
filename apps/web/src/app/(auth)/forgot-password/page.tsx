import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ForgotPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </AuthGuard>
  );
}
