import {normalizeEmail, validateEmail} from '../../../src/utils/common';

describe('common utils', () => {
  it('normalizes email casing and surrounding whitespace', () => {
    expect(normalizeEmail(' USER@Example.COM ')).toBe('user@example.com');
  });

  it('validates normalized email addresses', () => {
    expect(validateEmail(normalizeEmail(' USER@Example.COM '))).toBe(true);
  });
});
