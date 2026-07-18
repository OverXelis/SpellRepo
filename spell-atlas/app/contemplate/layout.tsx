import { Nav } from '@/components/nav';

export default function ContemplateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
