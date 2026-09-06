#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/ab95f7c60a725008847fc11cf36a4bae75f0b0b5abc7c5110147e7da4d3736c2/contract';
import endContract from '../../snapshots/ab95f7c60a725008847fc11cf36a4bae75f0b0b5abc7c5110147e7da4d3736c2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'projects',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'projects_pkey' }),
          checkExpression('projects_name_check', "(TRIM(BOTH FROM name) <> ''::text)"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'tasks',
        columns: [
          col('done', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('due_date', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('priority', 'text', {
            notNull: true,
            default: lit('medium'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('project_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('text', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'tasks_pkey' }),
          checkExpression(
            'tasks_priority_check',
            "(priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))",
          ),
          checkExpression('tasks_text_check', "(TRIM(BOTH FROM text) <> ''::text)"),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'tasks',
        index: 'idx_tasks_project_id',
        columns: ['project_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'tasks',
        foreignKey: {
          name: 'tasks_project_id_fkey',
          columns: ['project_id'],
          references: { schema: 'public', table: 'projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
