import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import { buildDatabaseUrlFromEnv } from './server/src/database/connection-config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./server/src/prisma/contract.prisma",
    db: {
      connection: buildDatabaseUrlFromEnv(),
    },
  }),
});
