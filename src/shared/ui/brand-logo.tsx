import Image from 'next/image';

import fullColour from '../../../public/brand/LC_Skopje_red.png';
import icon from '../../../public/brand/eestecredsquare.png';
import white from '../../../public/brand/LC_Skopje_white.png';

// Default logo files (public/brand). Settings › Branding can replace them (pass `asset`).
const logos = { red: fullColour, white, icon } as const;

/** A replacement file from Settings › Branding. */
export type LogoAsset = { src: string; width: number; height: number };

type BrandLogoProps = {
  variant: keyof typeof logos;
  /** The file chosen in Settings › Branding; the default file otherwise. */
  asset?: LogoAsset | null;
  /** Rendered height in px; width follows the file's aspect ratio. */
  height: number;
  /** Empty when the logo sits next to visible text (decorative). */
  alt: string;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({ variant, asset, height, alt, priority, className }: BrandLogoProps) {
  const file = asset ?? logos[variant];
  const width = Math.round((file.width / file.height) * height);
  return (
    <Image
      src={asset ? asset.src : logos[variant]}
      // Library uploads may be SVG (not optimizable); the shipped PNGs are optimized.
      unoptimized={asset ? !asset.src.startsWith('/brand/') : undefined}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={className}
      // CSS may resize the height (e.g. smaller on mobile); keep the aspect ratio.
      style={{ width: 'auto' }}
    />
  );
}
