import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Button';
import { AuthCallbackContent } from './content';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner className="h-6 w-6" /></div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
