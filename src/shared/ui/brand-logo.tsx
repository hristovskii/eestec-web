import Image from 'next/image';

import fullColour from '../../../public/brand/LC_Skopje_red.png';
import icon from '../../../public/brand/eestecredsquare.png';
import white from '../../../public/brand/LC_Skopje_white.png';

// Default logo files (public/brand). Settings › Branding can replace them later (M4).
const logos = { red: fullColour, white, icon } as const;

type BrandLogoProps = {
  variant: keyof typeof logos;
  /** Rendered height in px; width follows the file's aspect ratio. */
  height: number;
  /** Empty when the logo sits next to visible text (decorative). */
  alt: string;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({ variant, height, alt, priority, className }: BrandLogoProps) {
  const file = logos[variant];
  const width = Math.round((file.width / file.height) * height);
  return (
    <Image
      src={file}
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
