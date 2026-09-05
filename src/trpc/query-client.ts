import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that navigating back to a listing feels instant,
        // short enough that stock changes surface quickly.
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          const code = (error as { data?: { code?: string } })?.data?.code
          if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN' || code === 'NOT_FOUND') return false
          return failureCount < 2
        },
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })
}
