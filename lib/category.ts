import pool from './db';

export function getMelbourneNow(): { shotDate: string; shotTime: string } {
  const now = new Date();

  const shotDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Melbourne',
    hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now);

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  const h = get('hour') === '24' ? '00' : get('hour').padStart(2, '0');
  const shotTime = `${h}:${get('minute').padStart(2, '0')}:${get('second').padStart(2, '0')}`;

  return { shotDate, shotTime };
}

function dobMelbourneStr(dobIso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(dobIso));
}

function computeAge(dobIso: string, shotDate: string): number {
  const dobStr = dobMelbourneStr(dobIso);
  const [dy, dm, dd] = dobStr.split('-').map(Number);
  const [sy, sm, sd] = shotDate.split('-').map(Number);
  let age = sy - dy;
  if (sm < dm || (sm === dm && sd < dd)) age--;
  return age;
}

export async function deriveCategory(
  dobIso: string,
  genderId: number,
  equipmentTypeId: number,
  shotDate: string,
): Promise<number> {
  const age = computeAge(dobIso, shotDate);

  const ageClassId = age <= 13 ? 3 : age >= 50 ? 2 : 1;

  const [rows] = await pool.query(
    'SELECT category_id FROM Category WHERE age_class_id = ? AND gender_id = ? AND equipment_type_id = ?',
    [ageClassId, genderId, equipmentTypeId],
  );
  const list = rows as Array<{ category_id: number }>;
  if (list.length !== 1) {
    throw new Error(
      `Category lookup returned ${list.length} rows for age_class_id=${ageClassId}, gender_id=${genderId}, equipment_type_id=${equipmentTypeId}`,
    );
  }
  return list[0].category_id;
}
