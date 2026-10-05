import {
  ArrowLeftRight,
  Calendar,
  Clock,
  Cpu,
  Flag,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Chip } from '@/shared/ui/chip';

import { DsSection } from './ds-section';

const swatches = [
  {
    name: 'Primary',
    hex: '#e52a30',
    token: '--color-primary · brand',
    use: 'Buttons, links on red, active nav, icons, accents',
    cls: 'bg-brand text-white',
  },
  {
    name: 'Primary dark',
    hex: '#b81f24',
    token: '--color-primary-dark · brand-dark',
    use: 'Hover / pressed, small red text on white',
    cls: 'bg-brand-dark text-white',
  },
  {
    name: 'White',
    hex: '#ffffff',
    token: '--color-white · white',
    use: 'Page background, text on red',
    cls: 'border-b border-line bg-white text-brand',
  },
  {
    name: 'Text',
    hex: '#1a1a1a',
    token: '--color-text · ink',
    use: 'Headings and body copy',
    cls: 'bg-ink text-white',
  },
  {
    name: 'Muted',
    hex: '#6b6b6b',
    token: '--color-muted · muted-ink',
    use: 'Dates, captions, secondary text',
    cls: 'bg-muted-ink text-white',
  },
  {
    name: 'Surface',
    hex: '#f5f5f5',
    token: '--color-surface · surface',
    use: 'Alternating sections, chips, card wells',
    cls: 'border-b border-line bg-surface text-ink',
  },
];

const contrast = [
  ['#1a1a1a on white', '17.4 : 1 ✓', 'All body text'],
  ['#6b6b6b on white / on #f5f5f5', '5.3 / 4.9 : 1 ✓', 'Captions and secondary text on both grounds'],
  ['#b81f24 on white', '6.4 : 1 ✓', 'Red links, eyebrows and any red text under 24px'],
];

export function ColorsSection() {
  return (
    <DsSection
      id="colors"
      title="Colors"
      intro="Red and white are the only brand colors. Neutrals are used only for text, borders and surfaces. Tailwind's default palette is removed: only these exist as classes."
      frames="01-Main"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {swatches.map((swatch) => (
          <div key={swatch.hex} className="overflow-hidden rounded-md border border-line">
            <div className={cn('flex h-32 items-end p-4 text-[20px] font-bold', swatch.cls)}>Aa</div>
            <div className="flex flex-col gap-1 p-4">
              <strong>
                {swatch.name} · {swatch.hex}
              </strong>
              <code className="text-small text-muted-ink">{swatch.token}</code>
              <span className="text-small">{swatch.use}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Chip>Border · #e3e3e3</Chip>
        <Chip>Input border · #8c8c8c (3:1)</Chip>
        <Chip>Shadow · 0 1px 2px / 0 4px 16px, black 6–8%</Chip>
      </div>
      <div className="overflow-hidden rounded-md border border-line text-small">
        <div className="grid grid-cols-[2fr_1fr_3fr] gap-4 bg-surface px-5 py-3.5 font-bold">
          <span>Pair</span>
          <span>Contrast</span>
          <span>Rule</span>
        </div>
        {contrast.map(([pair, ratio, rule]) => (
          <div key={pair} className="grid grid-cols-[2fr_1fr_3fr] gap-4 border-t border-line px-5 py-3.5">
            <span>{pair}</span>
            <span>{ratio}</span>
            <span>{rule}</span>
          </div>
        ))}
        <div className="grid grid-cols-[2fr_1fr_3fr] gap-4 border-t border-line bg-brand-tint px-5 py-3.5">
          <span>#e52a30 ↔ white</span>
          <span>4.46 : 1 · accepted</span>
          <span>
            Brand red stays exactly #e52a30. White text on red is always Roboto 500 or 700 and never smaller
            than 14px.
          </span>
        </div>
      </div>
    </DsSection>
  );
}

const typeRows = [
  {
    name: 'H1',
    spec: '48 / 1.15 desktop · 32 mobile · Bold',
    sample: <span className="type-h1">Start your EESTEC journey</span>,
  },
  {
    name: 'H2',
    spec: '36 / 1.2 desktop · 26 mobile · Bold',
    sample: <span className="type-h2">Tradition of LC Skopje</span>,
  },
  {
    name: 'H3',
    spec: '24 / 1.3 desktop · 20 mobile · Bold',
    sample: <span className="type-h3">Workshop: AI at the Edge</span>,
  },
  {
    name: 'Body',
    spec: '16 / 1.6 · Regular',
    sample: (
      <p className="max-w-[680px] text-body">
        EESTEC is a non-profit, non-political student association connecting electrical engineering and
        computer science students across Europe through workshops, exchanges and trainings.
      </p>
    ),
  },
  {
    name: 'Small',
    spec: '14 / 1.5 · Regular',
    sample: (
      <span className="text-small text-muted-ink">
        12–14 Sep 2026 · FEEIT, Skopje · Photo by Marija Stojanovska
      </span>
    ),
  },
  {
    name: 'Eyebrow',
    spec: '14 · Medium · Uppercase · #b81f24',
    sample: <span className="eyebrow">Latest activity</span>,
  },
  {
    name: 'Cyrillic',
    spec: 'MK is the default locale',
    sample: <span className="type-h3">Започни го твоето EESTEC патување</span>,
  },
];

export function TypographySection() {
  return (
    <DsSection
      id="typography"
      title="Typography"
      intro='Roboto · fallback "Helvetica Neue", Arial, sans-serif · Headings 700 · Body 400 · Buttons and labels 500'
      frames="01-Main"
    >
      <div className="flex flex-col">
        {typeRows.map((row) => (
          <div
            key={row.name}
            className="grid items-baseline gap-2 border-b border-line py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6"
          >
            <div className="flex flex-col gap-0.5">
              <strong>{row.name}</strong>
              <span className="text-small text-muted-ink">{row.spec}</span>
            </div>
            {row.sample}
          </div>
        ))}
        <div className="grid items-center gap-2 py-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
          <div className="flex flex-col gap-0.5">
            <strong>Weights</strong>
            <span className="text-small text-muted-ink">300 · 400 · 500 · 700</span>
          </div>
          <div className="flex flex-wrap gap-10 text-[32px]">
            <span className="font-light">Light</span>
            <span className="font-normal">Regular</span>
            <span className="font-medium">Medium</span>
            <span className="font-bold">Bold</span>
          </div>
        </div>
      </div>
    </DsSection>
  );
}

export function LogosSection() {
  return (
    <DsSection
      id="logos"
      title="Logos & favicon"
      intro="Provided files only, never redrawn. Replaceable from Admin → Settings → Branding."
      frames="01-Main"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <div className="flex h-55 items-center justify-center rounded-md border border-line bg-white">
            <BrandLogo
              variant="red"
              height={120}
              alt="EESTEC LC Skopje logo, red"
              className="h-auto w-[62%]"
            />
          </div>
          <span className="text-small">
            <strong>Full color</strong> · on white backgrounds
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex h-55 items-center justify-center rounded-md bg-brand">
            <BrandLogo
              variant="white"
              height={120}
              alt="EESTEC LC Skopje logo, white"
              className="h-auto w-[62%]"
            />
          </div>
          <span className="text-small">
            <strong>White</strong> · header, footer and red surfaces
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex h-55 items-end justify-center gap-4 rounded-md border border-line bg-surface pb-12">
            <BrandLogo variant="icon" height={64} alt="Square icon, 64px" className="rounded-md" />
            <BrandLogo variant="icon" height={32} alt="Square icon, 32px" className="rounded-[6px]" />
            <BrandLogo variant="icon" height={16} alt="Square icon, 16px" className="rounded-[3px]" />
          </div>
          <span className="text-small">
            <strong>Square icon</strong> · favicon, app icon, social avatar
          </span>
        </div>
      </div>
    </DsSection>
  );
}

const icons = [
  ['Workshops', Cpu],
  ['Exchanges', ArrowLeftRight],
  ['Motivational Weekends', Zap],
  ['Soft Skills', MessageCircle],
  ['Competitions', Trophy],
  ['Congress', Users],
  ['Calendar', Calendar],
  ['Location', MapPin],
  ['Time', Clock],
  ['Join', UserPlus],
  ['Volunteer', Heart],
  ['International', Globe],
  ['Lead', Flag],
] as const;

export function LayoutAndIconsSection() {
  return (
    <section className="grid gap-12 border-t border-line py-18 lg:grid-cols-2" aria-label="Layout and icons">
      <DsSection id="layout" title="Layout" className="border-t-0 py-0">
        <div className="flex flex-col gap-2.5 text-small">
          <span>
            <strong>Container</strong> · max 1200px, centered, 24px side padding (16px under 640px) ·{' '}
            {'<Container>'}
          </span>
          <span>
            <strong>Breakpoints</strong> · 640 · 1024 · 1280 (mobile first) · sm / lg / xl
          </span>
          <span>
            <strong>Section rhythm</strong> · 96px vertical desktop, 64px mobile; alternate white / #f5f5f5 ·{' '}
            {'<Section tone>'}
          </span>
          <span>
            <strong>Grid</strong> · 12 columns, 24px gutter · cards 3 / 2 / 1 per row
          </span>
          <span>
            <strong>Radius</strong> · 8 buttons and inputs · 12 cards · 16 panels and dialogs · 999 chips
          </span>
          <span>
            <strong>Touch targets</strong> · 44px minimum
          </span>
        </div>
        <div className="flex items-end gap-3">
          {[4, 8, 12, 16, 24, 32, 48, 64, 96].map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <span className="bg-brand" style={{ width: size, height: size }} />
              <span className="text-small text-muted-ink">{size}</span>
            </div>
          ))}
        </div>
      </DsSection>
      <DsSection
        id="icons"
        title="Icons"
        intro="lucide-react · 24px outline, 2px stroke, round caps. Red for accents, #1a1a1a or white otherwise."
        className="border-t-0 py-0"
      >
        <div className="grid grid-cols-6 gap-3 text-brand">
          {icons.map(([name, Icon]) => (
            <span
              key={name}
              title={name}
              className="flex h-14 items-center justify-center rounded-sm bg-surface"
            >
              <Icon className="size-6" aria-label={name} />
            </span>
          ))}
        </div>
      </DsSection>
    </section>
  );
}
