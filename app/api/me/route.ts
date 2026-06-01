import { NextResponse } from 'next/server';
import { getSessionArcher } from '@/lib/auth';

export async function GET() {
  const archer = await getSessionArcher();
  if (!archer) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  return NextResponse.json({ archer });
}
