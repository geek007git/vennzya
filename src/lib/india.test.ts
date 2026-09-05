import { describe, expect, it } from 'vitest'
import {
  formatPhone,
  INDIAN_MOBILE_REGEX,
  isValidIndianMobile,
  normalizePhone,
  PINCODE_REGEX,
} from '@/lib/india'

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '919876543210'],
    ['+919876543210', '919876543210'],
    ['919876543210', '919876543210'],
    ['09876543210', '919876543210'],
    ['+91 98765 43210', '919876543210'],
    ['98765-43210', '919876543210'],
    ['+91-98765-43210', '919876543210'],
    ['  9876543210  ', '919876543210'],
  ])('stores %s as %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it('is stable when applied twice', () => {
    expect(normalizePhone(normalizePhone('+91 98765 43210'))).toBe('919876543210')
  })
})

describe('formatPhone', () => {
  it('renders a stored number in readable groups', () => {
    expect(formatPhone('919876543210')).toBe('+91 98765 43210')
  })
})

describe('INDIAN_MOBILE_REGEX', () => {
  it.each([
    '9876543210',
    '8123456789',
    '7012345678',
    '6012345678',
    '+919876543210',
    '919876543210',
    '09876543210',
  ])('accepts %s', (value) => {
    expect(INDIAN_MOBILE_REGEX.test(value)).toBe(true)
  })

  it.each([
    '1234567890',
    '5876543210',
    '12345',
    '987654321',
    '98765432101',
    '',
    'abcdefghij',
    '+1 5551234567',
  ])('rejects %s', (value) => {
    expect(INDIAN_MOBILE_REGEX.test(value)).toBe(false)
  })
})

describe('isValidIndianMobile', () => {
  it.each([
    '9876543210',
    '98765 43210',
    '+91 98765 43210',
    '+91-9876543210',
    '091 9876543210',
    ' 9876543210 ',
  ])('accepts %s as typed by a real person', (value) => {
    expect(isValidIndianMobile(value)).toBe(true)
  })

  it.each(['1234567890', '5876543210', '12345', '987654321', '', 'abcdefghij', '+1 5551234567'])(
    'rejects %s',
    (value) => {
      expect(isValidIndianMobile(value)).toBe(false)
    },
  )
})

describe('PINCODE_REGEX', () => {
  it.each(['600034', '110001', '400001', '999999'])('accepts %s', (value) => {
    expect(PINCODE_REGEX.test(value)).toBe(true)
  })

  it.each(['000000', '012345', '60003', '6000345', '', '60003a'])('rejects %s', (value) => {
    expect(PINCODE_REGEX.test(value)).toBe(false)
  })
})
