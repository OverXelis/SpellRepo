import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { exportAll } from '@/lib/db/export-import';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const db = getDb();
  const payload = exportAll(db);
  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="spell-atlas-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
});
