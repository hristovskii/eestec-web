/** Fails fast, with the fix, when the local stack is missing or PostgREST is not running. */
export default async function setup() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
    throw new Error('Supabase env is missing. Run `pnpm db:start`, then `pnpm test:supabase`.');
  }
  const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: anonKey } }).catch(() => null);
  if (!response?.ok) {
    throw new Error(`PostgREST is not answering at ${url}. Run \`pnpm db:start\` (it starts the API).`);
  }
}
