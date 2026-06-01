import mysql from 'mysql2/promise';

const globalForDb = globalThis as unknown as { db: mysql.Pool };

const pool =
  globalForDb.db ??
  mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? '3307'),
    user: process.env.DB_USER ?? 'archery_scorer',
    password: process.env.DB_PASSWORD ?? 'StrongPass_SC!7',
    database: process.env.DB_NAME ?? 'cos20031',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.db = pool;

export default pool;
