import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import pool from './db';

export const AUTH_COOKIE_NAME = 'archery_session';

const PASSWORD_HASH = 'sha256';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthArcher = {
  archer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  default_equipment_type_id: number;
  dob: string | Date;
  gender_id: number;
};

function authSecret(): string {
  return process.env.AUTH_COOKIE_SECRET ?? 'cos20031-local-dev-auth-secret';
}

export function hashPassword(password: string): string {
  return createHash(PASSWORD_HASH).update(password).digest('hex');
}

export function passwordMeetsPolicy(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function signArcherId(archerId: number): string {
  return createHmac('sha256', authSecret()).update(String(archerId)).digest('hex');
}

export function createSessionToken(archerId: number): string {
  return `${archerId}.${signArcherId(archerId)}`;
}

export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const [rawId, signature] = token.split('.');
  const archerId = Number(rawId);
  if (!Number.isInteger(archerId) || archerId <= 0 || !signature) return null;

  const expected = signArcherId(archerId);
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) return null;

  return timingSafeEqual(actualBuffer, expectedBuffer) ? archerId : null;
}

export async function getSessionArcherId(): Promise<number | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function getArcherById(archerId: number): Promise<AuthArcher | null> {
  const [rows] = await pool.query(
    `SELECT archer_id, first_name, last_name, email, default_equipment_type_id, dob, gender_id
     FROM Archer
     WHERE archer_id = ? AND email IS NOT NULL`,
    [archerId],
  );
  const archers = rows as AuthArcher[];
  return archers[0] ?? null;
}

export async function getSessionArcher(): Promise<AuthArcher | null> {
  const archerId = await getSessionArcherId();
  if (!archerId) return null;
  return getArcherById(archerId);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};
