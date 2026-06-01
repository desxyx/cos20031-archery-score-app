import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  hashPassword,
  passwordMeetsPolicy,
  sessionCookieOptions,
  type AuthArcher,
} from '@/lib/auth';

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginRow = AuthArcher & {
  password_hash: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (!passwordMeetsPolicy(password)) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters and include a letter, number, and symbol' },
      { status: 400 },
    );
  }

  const [rows] = await pool.query(
    `SELECT archer_id, first_name, last_name, email, default_equipment_type_id, dob, gender_id, password_hash
     FROM Archer
     WHERE LOWER(email) = ?`,
    [email],
  );
  const archers = rows as LoginRow[];
  const archer = archers[0];

  if (!archer || archer.password_hash !== hashPassword(password)) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const response = NextResponse.json({
    archer: {
      archer_id: archer.archer_id,
      first_name: archer.first_name,
      last_name: archer.last_name,
      email: archer.email,
      default_equipment_type_id: archer.default_equipment_type_id,
      dob: archer.dob,
      gender_id: archer.gender_id,
    },
  });
  response.cookies.set(AUTH_COOKIE_NAME, createSessionToken(archer.archer_id), sessionCookieOptions);
  return response;
}
