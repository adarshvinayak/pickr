import { describe, it, expect } from 'vitest';
import {
  isValidStatusTransition,
  validateStatusTransition,
  validateCancellation,
  validateReschedule,
} from '@/lib/status';

describe('Status Machine & Transition Rules (BUSINESS_RULES.md §5)', () => {
  it('Validates forward-only valid sequence', () => {
    expect(isValidStatusTransition('DRAFT', 'SEARCHING')).toBe(true);
    expect(isValidStatusTransition('SEARCHING', 'ACCEPTED')).toBe(true);
    expect(isValidStatusTransition('ACCEPTED', 'AT_PICKUP')).toBe(true);
    expect(isValidStatusTransition('AT_PICKUP', 'LOADED')).toBe(true);
    expect(isValidStatusTransition('LOADED', 'IN_TRANSIT')).toBe(true);
    expect(isValidStatusTransition('IN_TRANSIT', 'AT_DROP')).toBe(true);
    expect(isValidStatusTransition('AT_DROP', 'COMPLETED')).toBe(true);
  });

  it('Rejects invalid / backward transitions', () => {
    expect(validateStatusTransition('LOADED', 'ACCEPTED').allowed).toBe(false);
    expect(validateStatusTransition('IN_TRANSIT', 'LOADED').allowed).toBe(false);
    expect(validateStatusTransition('COMPLETED', 'SEARCHING').allowed).toBe(false);
    expect(validateStatusTransition('DRAFT', 'IN_TRANSIT').allowed).toBe(false);
    expect(validateStatusTransition('SEARCHING', 'COMPLETED').allowed).toBe(false);
  });

  it('Validates user cancellation before ACCEPTED is free', () => {
    const res1 = validateCancellation('SEARCHING', 'user', 2000);
    expect(res1.allowed).toBe(true);
    expect(res1.fee).toBe(0);

    const res2 = validateCancellation('DRAFT', 'user', 2000);
    expect(res2.allowed).toBe(true);
    expect(res2.fee).toBe(0);
  });

  it('Validates user cancellation after ACCEPTED has fee = min(100, 10% of total)', () => {
    // Total ₹2000 -> 10% = ₹200 -> min(100, 200) = ₹100
    const res1 = validateCancellation('ACCEPTED', 'user', 2000);
    expect(res1.allowed).toBe(true);
    expect(res1.fee).toBe(100);

    // Total ₹800 -> 10% = ₹80 -> min(100, 80) = ₹80
    const res2 = validateCancellation('ACCEPTED', 'user', 800);
    expect(res2.allowed).toBe(true);
    expect(res2.fee).toBe(80);
  });

  it('Blocks user cancellation from AT_PICKUP onward', () => {
    expect(validateCancellation('AT_PICKUP', 'user', 2000).allowed).toBe(false);
    expect(validateCancellation('LOADED', 'user', 2000).allowed).toBe(false);
    expect(validateCancellation('IN_TRANSIT', 'user', 2000).allowed).toBe(false);
  });

  it('Allows driver cancellation before LOADED with 0 fee', () => {
    const res1 = validateCancellation('ACCEPTED', 'driver', 2000);
    expect(res1.allowed).toBe(true);
    expect(res1.fee).toBe(0);

    const res2 = validateCancellation('AT_PICKUP', 'driver', 2000);
    expect(res2.allowed).toBe(true);
    expect(res2.fee).toBe(0);
  });

  it('Blocks driver cancellation once LOADED', () => {
    expect(validateCancellation('LOADED', 'driver', 2000).allowed).toBe(false);
    expect(validateCancellation('IN_TRANSIT', 'driver', 2000).allowed).toBe(false);
  });

  it('Validates reschedule rules (user only, allowed in SEARCHING and ACCEPTED)', () => {
    expect(validateReschedule('SEARCHING', 'user').allowed).toBe(true);
    expect(validateReschedule('SEARCHING', 'user').reenterSearching).toBe(false);

    const acceptResched = validateReschedule('ACCEPTED', 'user');
    expect(acceptResched.allowed).toBe(true);
    expect(acceptResched.reenterSearching).toBe(true);

    expect(validateReschedule('AT_PICKUP', 'user').allowed).toBe(false);
    expect(validateReschedule('SEARCHING', 'driver').allowed).toBe(false);
  });
});
