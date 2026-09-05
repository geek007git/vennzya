/** States and union territories, for address forms and GST place-of-supply. */
export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const

export type IndianState = (typeof INDIAN_STATES)[number]

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/
/** Accepts 10-digit mobile numbers, with or without +91 / 0 prefix. */
export const INDIAN_MOBILE_REGEX = /^(?:\+?91|0)?[6-9]\d{9}$/

/**
 * Validates the way a person actually types: "98765 43210", "+91-9876543210"
 * and "09876543210" are all the same number, so digits are extracted before
 * the pattern is applied.
 */
export function isValidIndianMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '')

  // Strip only the prefixes Indians actually write: 0, 91, 091.
  const national = digits
    .replace(/^0?91/, '')
    .replace(/^0/, '')

  if (national.length !== 10) return false

  return /^[6-9]\d{9}$/.test(national)
}

/** Stores phone numbers in one canonical shape: 91XXXXXXXXXX. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  const last10 = digits.slice(-10)
  return `91${last10}`
}

export function formatPhone(stored: string): string {
  const last10 = stored.slice(-10)
  return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
}
