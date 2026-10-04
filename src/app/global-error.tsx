'use client';

import '@/shared/styles/globals.css';

// Last-resort boundary when a root layout itself crashes: no providers are available here,
// so the copy is static and bilingual.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="mk">
      <body>
        <main className="mx-auto max-w-content px-4 py-24 font-sans sm:px-6">
          {/* eslint-disable i18next/no-literal-string */}
          <h1 className="text-h1-m font-bold">Нешто тргна наопаку · Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            className="mt-6 h-12 rounded-sm bg-brand px-6 font-medium text-white hover:bg-brand-dark"
          >
            Обиди се повторно · Try again
          </button>
          {/* eslint-enable i18next/no-literal-string */}
        </main>
      </body>
    </html>
  );
}
