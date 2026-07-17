'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      pathname?.startsWith(href) ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
    }`;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="mr-2 text-sm font-semibold text-neutral-100">Spell Atlas</span>
        <Link href="/builder" className={linkClass('/builder')}>
          Builder
        </Link>
        <Link href="/chat" className={linkClass('/chat')}>
          Chat
        </Link>
      </div>
      <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-neutral-300">
        Log out
      </button>
    </nav>
  );
}
