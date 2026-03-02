import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateOffset, isValidId } from './helpers.js';

describe('Hjálparföll', () => {
  it('calculateOffset ætti að skila réttu offseti', () => {
    assert.strictEqual(calculateOffset(1, 10), 0);
    assert.strictEqual(calculateOffset(2, 10), 10);
    assert.strictEqual(calculateOffset(0, 10), 0);
  });

  it('isValidId ætti að þekkja lögleg og ólögleg ID', () => {
    assert.strictEqual(isValidId('5'), true);
    assert.strictEqual(isValidId('abc'), false);
    assert.strictEqual(isValidId('-1'), false);
  });
});