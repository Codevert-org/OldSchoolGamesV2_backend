import { defineConfig } from 'prisma/config';
import { env } from 'node:process';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env.DATABASE_URL,
  },
});
