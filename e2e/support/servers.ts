// Ports of the two e2e servers (playwright.config.ts): the same build, started twice.
export const PORT = 3100;
/** Started with VERCEL_ENV=production, for gates read at request time (mock admin sign-in). */
export const PRODUCTION_PORT = 3101;
export const PRODUCTION_URL = `http://localhost:${PRODUCTION_PORT}`;
