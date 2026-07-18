'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { CloseIcon, MenuIcon } from '@/components/ui/icons';

const NAV_LINKS: { href: string; label: string; longLabel?: string }[] = [
  { href: '/builder', label: 'Builder' },
  { href: '/contemplate', label: 'Contemplate', longLabel: 'Contemplate Meaning' },
  { href: '/chat', label: 'Chat' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (href: string) => {
    const active = pathname?.startsWith(href);
    return `ui-btn-sm ${active ? 'bg-surface-hover text-accent' : 'ui-btn-ghost'}`;
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-[var(--nav-height)] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/builder" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="SWC" width={36} height={36} className="h-9 w-9 rounded-md" priority />
            <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">Spell Atlas</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label, longLabel }) => (
              <Link key={href} href={href} className={linkClass(href)}>
                <span className="xl:hidden">{label}</span>
                <span className="hidden xl:inline">{longLabel ?? label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleLogout} className="ui-btn-sm ui-btn-ghost hidden sm:inline-flex">
            Log out
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="ui-btn-sm ui-btn-secondary md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border-subtle bg-surface px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, longLabel }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`${linkClass(href)} w-full justify-start`}
              >
                {longLabel ?? label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="ui-btn-sm ui-btn-ghost mt-1 w-full justify-start"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
