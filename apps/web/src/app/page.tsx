import { Logo } from '@/components/ui/Logo';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Logo showTagline />
      <p className="mt-6 text-lg text-[var(--text-secondary)] text-center max-w-2xl">
        Build, hire, and get paid securely with trustless escrow on Stellar Soroban.
      </p>
    </main>
  );
}
