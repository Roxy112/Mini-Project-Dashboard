import 'dotenv/config';
import postgres, { type PostgresClient } from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import pool from '../database/pool';

export type PrismaDb = PostgresClient<Contract>;

export function createDb(pgPool = pool): PrismaDb {
  return postgres<Contract>({
    contractJson,
    pg: pgPool as unknown as Parameters<typeof postgres>[0]['pg'],
  });
}

export const db = createDb(pool);
