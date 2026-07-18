import Image from 'next/image';

export function PageBanner() {
  return (
    <div className="mb-6 flex w-full justify-center">
      <Image
        src="/name-banner.png"
        alt="Spell Weaver Chronicles"
        width={1920}
        height={1080}
        className="h-auto w-full max-w-4xl max-h-36 object-contain object-center sm:max-h-44 md:max-h-52"
        priority
      />
    </div>
  );
}
