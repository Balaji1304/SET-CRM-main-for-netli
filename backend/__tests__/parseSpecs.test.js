const parseSpecs = require('../utils/parseSpecs');

describe('parseSpecs', () => {
  test('returns object as-is', () => {
    const obj = { power: 'Solar', efficiency: '78%' };
    expect(parseSpecs(obj)).toEqual(obj);
  });

  test('parses a JSON string into an object', () => {
    const str = '{"power":"Solar","efficiency":"78%"}';
    expect(parseSpecs(str)).toEqual({ power: 'Solar', efficiency: '78%' });
  });

  test('parses double-stringified JSON', () => {
    const inner = { power: '75W Panel', warranty: '5 years' };
    const doubleStr = JSON.stringify(JSON.stringify(inner));
    expect(parseSpecs(doubleStr)).toEqual(inner);
  });

  test('returns {} for null/undefined/empty', () => {
    expect(parseSpecs(null)).toEqual({});
    expect(parseSpecs(undefined)).toEqual({});
    expect(parseSpecs('')).toEqual({});
    expect(parseSpecs(0)).toEqual({});
  });

  test('returns {} for invalid JSON string', () => {
    expect(parseSpecs('not-json')).toEqual({});
  });

  test('returns {} for array', () => {
    expect(parseSpecs([1, 2])).toEqual({});
    expect(parseSpecs('["a","b"]')).toEqual({});
  });

  test('does not iterate a plain string as characters', () => {
    const str = '{"power":"Solar"}';
    const result = parseSpecs(str);
    expect(result).not.toHaveProperty('0');
    expect(result).toHaveProperty('power', 'Solar');
  });
});
