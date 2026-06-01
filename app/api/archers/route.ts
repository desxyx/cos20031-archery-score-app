import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const [archerRows] = await pool.query(
    `SELECT archer_id, first_name, last_name, default_equipment_type_id, dob, gender_id
     FROM Archer
     ORDER BY last_name, first_name`
  );

  const [equipmentRows] = await pool.query(
    `SELECT equipment_type_id, name, code
     FROM Equipment_Type
     ORDER BY equipment_type_id`
  );

  return NextResponse.json({
    archers: archerRows,
    equipment_types: equipmentRows,
  });
}
