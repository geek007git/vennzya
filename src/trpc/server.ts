import 'server-only'

import { headers } from 'next/headers'
import { cache } from 'react'
import { createTRPCContext } from '@/server/trpc/init'
import { createCaller } from '@/server/trpc/root'

/**
 * Direct in-process caller for server components — no HTTP hop, no waterfall.
 * `cache` dedupes the session lookup across a single render pass.
 */
const createContext = cache(async () => createTRPCContext({ headers: await headers() }))

export const trpc = createCaller(createContext)
