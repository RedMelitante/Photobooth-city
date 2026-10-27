import { searchIndex } from '@/lib/catalog';

export function GET() {
  return new Response(JSON.stringify(searchIndex()), {
    headers: { 'Content-Type': 'application/json' },
  });
}
