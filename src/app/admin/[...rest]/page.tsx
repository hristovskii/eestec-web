import { notFound } from 'next/navigation';

// Unknown /admin/* paths render admin/not-found.tsx. Without this they would fall into [locale].
export default function AdminCatchAll() {
  notFound();
}
