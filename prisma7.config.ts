import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Neon pools connections and migrations need the unpooled endpoint, so
    // DIRECT_URL wins here when it is set.
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
})
