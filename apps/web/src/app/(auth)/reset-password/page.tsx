import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ResetPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </AuthGuard>
  );
}
