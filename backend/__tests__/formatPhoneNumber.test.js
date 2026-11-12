const { formatPhoneNumber } = require('../utils/sendWhatsApp');

describe('formatPhoneNumber', () => {
  test('10-digit local number gets country code', () => {
    expect(formatPhoneNumber('9876543210')).toBe('919876543210');
  });

  test('10-digit number starting with 91 still gets country code', () => {
    expect(formatPhoneNumber('9198765432')).toBe('919198765432');
  });

  test('number with + and spaces is normalised', () => {
    expect(formatPhoneNumber('+91 98765 43210')).toBe('919876543210');
  });

  test('leading 0 is stripped before prepending country code', () => {
    expect(formatPhoneNumber('09876543210')).toBe('919876543210');
  });

  test('already prefixed cc+10 digits kept as-is', () => {
    expect(formatPhoneNumber('919876543210')).toBe('919876543210');
  });

  test('non-Indian number with explicit country code', () => {
    expect(formatPhoneNumber('2025551234', '+1')).toBe('12025551234');
  });
});
