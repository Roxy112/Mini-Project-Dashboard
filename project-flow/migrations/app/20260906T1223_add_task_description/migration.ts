#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1e436c83e26bc9f8e64341a4a93ec693f00ac4103328831ca875046154468461/contract';
import endContract from '../../snapshots/1e436c83e26bc9f8e64341a4a93ec693f00ac4103328831ca875046154468461/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ab95f7c60a725008847fc11cf36a4bae75f0b0b5abc7c5110147e7da4d3736c2/contract';
import startContract from '../../snapshots/ab95f7c60a725008847fc11cf36a4bae75f0b0b5abc7c5110147e7da4d3736c2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tasks',
        column: col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
