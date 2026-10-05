import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

/**
 * Decided exception (handoff Main › Colors): white on brand red #e52a30 is 4.46:1, accepted by the
 * design as long as the text is Roboto 500/700 and at least 14 px. Only that exact pair is ignored.
 */
function isAcceptedBrandRedPair(node: Violation['nodes'][number]): boolean {
  const data = node.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
  return data?.fgColor === '#ffffff' && data.bgColor === '#e52a30';
}

/** Serious and critical axe violations, minus the accepted brand-red pair. */
export async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({
      ...v,
      nodes: v.id === 'color-contrast' ? v.nodes.filter((n) => !isAcceptedBrandRedPair(n)) : v.nodes,
    }))
    .filter((v) => v.nodes.length > 0)
    .map((v) => ({ id: v.id, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
}
