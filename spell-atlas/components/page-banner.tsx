import Image from 'next/image';

export function PageBanner() {
  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-border-subtle bg-black">
      <Image
        src="/name-banner.png"
        alt="Spell Weaver Chronicles"
        width={640}
        height={120}
        className="h-auto w-full max-h-24 object-contain object-left sm:max-h-28"
        priority
      />
    </div>
  );
}
