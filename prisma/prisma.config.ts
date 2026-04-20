import { defineConfig } from 'prisma/config';
import { env } from 'node:process';
import path from 'node:path';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: env.DATABASE_URL,
  },
});
