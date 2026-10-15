import { type JsonLd, serializeJsonLd } from './json-ld';

/** Structured data for search engines. Renders nothing visible. */
export function JsonLdScript({ data }: { data: JsonLd }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
