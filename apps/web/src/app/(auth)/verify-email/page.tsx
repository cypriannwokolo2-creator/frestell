import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function VerifyEmailPage() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthLayout>
        <VerifyEmailForm />
      </AuthLayout>
    </AuthGuard>
  );
}
