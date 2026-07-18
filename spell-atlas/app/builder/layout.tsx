import { Nav } from '@/components/nav';

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
