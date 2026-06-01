import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const [rows] = await pool.query(
    `SELECT r.round_id, r.name, r.total_arrows,
            rr.round_range_id, rr.range_order, rr.ends_count,
            rr.distance_id, d.metres AS distance_metres,
            rr.target_face_id, tf.diameter_cm AS target_face_cm, tf.name AS target_face_name
     FROM Round r
     JOIN Round_Range rr ON r.round_id = rr.round_id
     JOIN Distance d      ON rr.distance_id = d.distance_id
     JOIN Target_Face tf  ON rr.target_face_id = tf.target_face_id
     ORDER BY r.round_id, rr.range_order`
  );

  const roundMap = new Map<number, {
    round_id: number; name: string; total_arrows: number;
    ranges: {
      round_range_id: number; range_order: number; ends_count: number;
      distance_metres: number; target_face_cm: number; target_face_name: string;
    }[];
  }>();

  for (const row of rows as Record<string, unknown>[]) {
    const id = row.round_id as number;
    if (!roundMap.has(id)) {
      roundMap.set(id, {
        round_id: id,
        name: row.name as string,
        total_arrows: row.total_arrows as number,
        ranges: [],
      });
    }
    roundMap.get(id)!.ranges.push({
      round_range_id: row.round_range_id as number,
      range_order: row.range_order as number,
      ends_count: row.ends_count as number,
      distance_metres: row.distance_metres as number,
      target_face_cm: row.target_face_cm as number,
      target_face_name: row.target_face_name as string,
    });
  }

  return NextResponse.json(Array.from(roundMap.values()));
}
