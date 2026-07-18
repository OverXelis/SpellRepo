'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect password');
        setLoading(false);
        return;
      }
      router.push(params.get('next') || '/builder');
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <form onSubmit={handleSubmit} className="ui-panel w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SWC" width={40} height={40} className="h-10 w-10 rounded-md" priority />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Spell Atlas</h1>
            <p className="text-xs text-foreground-muted">Spell Weaver Chronicles</p>
          </div>
        </div>
        <p className="text-sm text-foreground-muted">Enter the passphrase to continue.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passphrase"
          className="ui-input"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading || !password} className="ui-btn ui-btn-primary w-full">
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
