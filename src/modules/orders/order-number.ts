import type { Prisma } from '@/generated/prisma/client'

/**
 * Indian GST invoices need a sequential, gapless series per financial year
 * (April–March), so the number comes from a Postgres sequence rather than a
 * row count, which would race under concurrent checkouts.
 */
export function financialYearLabel(date: Date): string {
  const year = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? year : year - 1
  return `${String(startYear).slice(2)}${String(startYear + 1).slice(2)}`
}

export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  now = new Date(),
): Promise<string> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq')`
  const value = rows[0]?.nextval ?? 1n
  return `VFH-${financialYearLabel(now)}-${String(value).padStart(5, '0')}`
}
