import { NextResponse } from 'next/server';
import type { ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { deriveCategory, getMelbourneNow } from '@/lib/category';
import { getSessionArcher } from '@/lib/auth';

const VALID_ARROWS = new Set(['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M']);

function effectiveNum(v: string): number {
  if (v === 'X') return 11;
  if (v === 'M') return 0;
  return parseInt(v, 10);
}

function isDescending(arrows: string[]): boolean {
  for (let i = 1; i < arrows.length; i++) {
    if (effectiveNum(arrows[i]) > effectiveNum(arrows[i - 1])) return false;
  }
  return true;
}

type EndPayload = { rangeOrder: number; endOrder: number; arrows: string[] };

type RequestBody = {
  roundId: number;
  equipmentTypeId: number;
  ends: EndPayload[];
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { roundId, equipmentTypeId, ends } = body;
  const archer = await getSessionArcher();

  if (!archer) {
    return NextResponse.json({ error: 'Sign in before submitting a score' }, { status: 401 });
  }

  if (!roundId || !equipmentTypeId || !Array.isArray(ends) || ends.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const [rangeRows] = await pool.query(
    'SELECT range_order, ends_count FROM Round_Range WHERE round_id = ? ORDER BY range_order',
    [roundId],
  );
  const ranges = rangeRows as Array<{ range_order: number; ends_count: number }>;
  if (ranges.length === 0) {
    return NextResponse.json({ error: `Round ${roundId} not found or has no ranges` }, { status: 404 });
  }

  const expectedKeys = new Set<string>();
  for (const range of ranges) {
    for (let e = 1; e <= range.ends_count; e++) {
      expectedKeys.add(`${range.range_order}:${e}`);
    }
  }

  if (ends.length !== expectedKeys.size) {
    return NextResponse.json(
      { error: `Round ${roundId} expects ${expectedKeys.size} ends, payload has ${ends.length}` },
      { status: 422 },
    );
  }

  const seenKeys = new Set<string>();
  for (const end of ends) {
    const key = `${end.rangeOrder}:${end.endOrder}`;
    if (seenKeys.has(key)) {
      return NextResponse.json(
        { error: `Duplicate end: range_order=${end.rangeOrder} end_order=${end.endOrder}` },
        { status: 422 },
      );
    }
    seenKeys.add(key);
    if (!expectedKeys.has(key)) {
      return NextResponse.json(
        { error: `End range_order=${end.rangeOrder} end_order=${end.endOrder} does not exist in round ${roundId}` },
        { status: 422 },
      );
    }
  }

  for (const end of ends) {
    if (!Array.isArray(end.arrows) || end.arrows.length !== 6) {
      return NextResponse.json(
        { error: `End range_order=${end.rangeOrder} end_order=${end.endOrder}: must have exactly 6 arrows` },
        { status: 400 },
      );
    }
    for (const arrow of end.arrows) {
      if (!VALID_ARROWS.has(arrow)) {
        return NextResponse.json(
          { error: `End range_order=${end.rangeOrder} end_order=${end.endOrder}: invalid arrow value "${arrow}"` },
          { status: 400 },
        );
      }
    }
    if (!isDescending(end.arrows)) {
      return NextResponse.json(
        { error: `End range_order=${end.rangeOrder} end_order=${end.endOrder}: arrows not in descending order` },
        { status: 422 },
      );
    }
  }

  const { shotDate, shotTime } = getMelbourneNow();

  let categoryId: number;
  try {
    const dobIso = archer.dob instanceof Date ? archer.dob.toISOString() : archer.dob;
    categoryId = await deriveCategory(dobIso, archer.gender_id, equipmentTypeId, shotDate);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [scoreResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO Staged_Score (archer_id, round_id, equipment_type_id, category_id, shot_date, shot_time, is_competition, staged_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [archer.archer_id, roundId, equipmentTypeId, categoryId, shotDate, shotTime],
    );
    const stagedScoreId = scoreResult.insertId;

    for (const end of ends) {
      const [endResult] = await connection.execute<ResultSetHeader>(
        'INSERT INTO Staged_Score_End (staged_score_id, range_order, end_order) VALUES (?, ?, ?)',
        [stagedScoreId, end.rangeOrder, end.endOrder],
      );
      const stagedEndId = endResult.insertId;

      for (let slot = 0; slot < end.arrows.length; slot++) {
        const arrow = end.arrows[slot];
        const isX = arrow === 'X' ? 1 : 0;
        const scoreValue = arrow === 'X' ? 10 : arrow === 'M' ? 0 : parseInt(arrow, 10);
        await connection.execute(
          'INSERT INTO Staged_Arrow_Score (staged_end_id, arrow_slot, score_value, is_x) VALUES (?, ?, ?, ?)',
          [stagedEndId, slot + 1, scoreValue, isX],
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ staged_score_id: stagedScoreId, shot_date: shotDate, shot_time: shotTime, category_id: categoryId });
  } catch (err) {
    await connection.rollback();
    return NextResponse.json({ error: 'Transaction failed: ' + (err as Error).message }, { status: 500 });
  } finally {
    connection.release();
  }
}
