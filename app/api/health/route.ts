import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM Archer');
  const count = (rows as Array<{ cnt: number }>)[0].cnt;
  return NextResponse.json({ archerCount: count });
}
