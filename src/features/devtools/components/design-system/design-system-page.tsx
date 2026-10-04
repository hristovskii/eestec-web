import { BrandLogo } from '@/shared/ui/brand-logo';
import { Container } from '@/shared/ui/container';

import { BadgesAndTitleSection, ButtonsSection } from './actions';
import { CardsSection } from './cards';
import { FormsSection } from './forms';
import { ColorsSection, LayoutAndIconsSection, LogosSection, TypographySection } from './foundations';
import { NavigationSection } from './navigation';
import { OverlaysSection } from './overlays';

const toc = [
  ['colors', 'Colors'],
  ['typography', 'Typography'],
  ['logos', 'Logos'],
  ['buttons', 'Buttons'],
  ['badges', 'Badges & chips'],
  ['cards', 'Cards'],
  ['forms', 'Forms'],
  ['navigation', 'Lists'],
  ['overlays', 'Overlays'],
  ['layout', 'Layout & icons'],
] as const;

/** Component lab: every shared component and state, laid out like the canvas Main frame. */
export function DesignSystemPage() {
  return (
    <div className="bg-white">
      <div className="border-b border-line bg-surface">
        <Container className="flex flex-wrap items-center gap-4 py-5">
          <BrandLogo variant="red" height={44} alt="EESTEC LC Skopje" />
          <span className="h-7 w-px bg-line-strong" />
          <span className="text-small font-medium">eestec.mk · Design system</span>
          <span className="ml-auto text-small text-muted-ink">
            Dev and preview only · source: handoff/design-source/Main.dc.html
          </span>
        </Container>
      </div>
      <Container>
        <section className="grid items-end gap-12 pt-18 pb-16 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">Foundations</span>
            <h1 className="type-h1">One system for every page of eestec.mk</h1>
          </div>
          <p className="text-[18px] text-muted-ink">
            Red and white, Roboto, and a small set of shared components. Each piece below is one React
            component or token, so every page from Home to the Admin Panel stays consistent.
          </p>
        </section>
        <nav aria-label="Sections" className="flex flex-wrap gap-x-5 gap-y-2 pb-10 text-small">
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="font-medium text-brand-dark no-underline hover:underline">
              {label}
            </a>
          ))}
        </nav>
        <ColorsSection />
        <TypographySection />
        <LogosSection />
        <ButtonsSection />
        <BadgesAndTitleSection />
        <CardsSection />
        <FormsSection />
        <NavigationSection />
        <OverlaysSection />
        <LayoutAndIconsSection />
        <p className="border-t border-line py-10 text-small text-muted-ink">
          Header and Footer (Main › Header, Footer) arrive in M2. Admin patterns (tables, save bar, dialogs)
          arrive in M3.
        </p>
      </Container>
    </div>
  );
}
