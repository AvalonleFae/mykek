import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatCurrency,
  formatDate,
  formatOrderConfirmation,
  formatNewOrderMerchant,
  formatStatusChange,
  formatOTPMessage,
  truncateMessage,
} from '../messageFormatter.js';

// ─── formatCurrency ────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats basic amount: 150 → "RM 150.00"', () => {
    expect(formatCurrency(150)).toBe('RM 150.00');
  });

  it('formats thousands: 1500 → "RM 1,500.00"', () => {
    expect(formatCurrency(1500)).toBe('RM 1,500.00');
  });

  it('formats zero: 0 → "RM 0.00"', () => {
    expect(formatCurrency(0)).toBe('RM 0.00');
  });

  it('formats decimal: 1234.50 → "RM 1,234.50"', () => {
    expect(formatCurrency(1234.5)).toBe('RM 1,234.50');
  });
});

// ─── formatDate ────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats Date object: new Date("2025-01-15") → "15/01/2025"', () => {
    // Use UTC parts to avoid timezone issues
    const date = new Date('2025-01-15T00:00:00');
    expect(formatDate(date)).toBe('15/01/2025');
  });

  it('formats string input: "2025-12-01" → "01/12/2025"', () => {
    expect(formatDate('2025-12-01T00:00:00')).toBe('01/12/2025');
  });

  it('zero-pads single-digit day and month', () => {
    const date = new Date('2025-03-05T00:00:00');
    const result = formatDate(date);
    expect(result).toBe('05/03/2025');
    // Verify day and month are zero-padded
    const [day, month] = result.split('/');
    expect(day).toHaveLength(2);
    expect(month).toHaveLength(2);
  });
});

// ─── formatOrderConfirmation ───────────────────────────────────────

describe('formatOrderConfirmation', () => {
  const tempahan = {
    tempahanId: 'TMP00042',
    tarikhAmbil: '2025-01-15T00:00:00',
    kaedahPenghantaran: 'Ambil Sendiri',
    jumlahHarga: 150,
    statusTempahan: 'Menunggu Pengesahan',
  };
  const namaPelanggan = 'Ahmad';

  it('has "MyKek" as first line', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    const lines = msg.split('\n');
    expect(lines[0]).toBe('MyKek');
  });

  it('has blank line after header', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    const lines = msg.split('\n');
    expect(lines[1]).toBe('');
  });

  it('contains customer name in greeting', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('Hai Ahmad,');
  });

  it('contains tempahanId', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('TMP00042');
  });

  it('contains tarikhAmbil in DD/MM/YYYY format', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('15/01/2025');
  });

  it('contains kaedahPenghantaran', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('Ambil Sendiri');
  });

  it('contains jumlahHarga in RM format', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('RM 150.00');
  });

  it('contains statusTempahan', () => {
    const msg = formatOrderConfirmation(tempahan, namaPelanggan);
    expect(msg).toContain('Menunggu Pengesahan');
  });
});

// ─── formatNewOrderMerchant ────────────────────────────────────────

describe('formatNewOrderMerchant', () => {
  const tempahan = {
    tempahanId: 'TMP00099',
    tarikhAmbil: '2025-06-20T00:00:00',
    jumlahHarga: 2500,
    kaedahPenghantaran: 'Penghantaran',
  };
  const namaPelanggan = 'Siti';

  it('has MyKek header', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    const lines = msg.split('\n');
    expect(lines[0]).toBe('MyKek');
  });

  it('contains tempahanId', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    expect(msg).toContain('TMP00099');
  });

  it('contains customer nama', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    expect(msg).toContain('Siti');
  });

  it('contains tarikhAmbil in DD/MM/YYYY', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    expect(msg).toContain('20/06/2025');
  });

  it('contains jumlahHarga in RM format', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    expect(msg).toContain('RM 2,500.00');
  });

  it('contains kaedahPenghantaran', () => {
    const msg = formatNewOrderMerchant(tempahan, namaPelanggan);
    expect(msg).toContain('Penghantaran');
  });
});

// ─── formatStatusChange ────────────────────────────────────────────

describe('formatStatusChange', () => {
  it('Diterima message contains tempahanId and acceptance text', () => {
    const tempahan = { tempahanId: 'TMP00001', statusTempahan: 'Diterima' };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('TMP00001');
    expect(msg).toContain('diterima');
  });

  it('Ditolak with sebabTolak includes the reason', () => {
    const tempahan = {
      tempahanId: 'TMP00002',
      statusTempahan: 'Ditolak',
      sebabTolak: 'Tarikh yang dipilih sudah penuh',
    };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('Tarikh yang dipilih sudah penuh');
  });

  it('Ditolak with null sebabTolak uses default text', () => {
    const tempahan = {
      tempahanId: 'TMP00003',
      statusTempahan: 'Ditolak',
      sebabTolak: null,
    };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('Tiada sebab khusus diberikan');
  });

  it('Ditolak with empty sebabTolak uses default text', () => {
    const tempahan = {
      tempahanId: 'TMP00004',
      statusTempahan: 'Ditolak',
      sebabTolak: '   ',
    };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('Tiada sebab khusus diberikan');
  });

  it('Siap with "Ambil Sendiri" mentions pickup', () => {
    const tempahan = {
      tempahanId: 'TMP00005',
      statusTempahan: 'Siap',
      kaedahPenghantaran: 'Ambil Sendiri',
    };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('mengambil');
  });

  it('Siap with "Penghantaran" mentions delivery', () => {
    const tempahan = {
      tempahanId: 'TMP00006',
      statusTempahan: 'Siap',
      kaedahPenghantaran: 'Penghantaran',
    };
    const msg = formatStatusChange(tempahan, 'Ali');
    expect(msg).toContain('dihantar');
  });
});

// ─── formatOTPMessage ──────────────────────────────────────────────

describe('formatOTPMessage', () => {
  it('contains the code', () => {
    const msg = formatOTPMessage('482915', 'Ahmad');
    expect(msg).toContain('482915');
  });

  it('contains 5-minute warning', () => {
    const msg = formatOTPMessage('123456', 'Ahmad');
    expect(msg).toContain('5 minit');
  });

  it('has MyKek header', () => {
    const msg = formatOTPMessage('999999', 'Ahmad');
    const lines = msg.split('\n');
    expect(lines[0]).toBe('MyKek');
  });
});

// ─── truncateMessage ───────────────────────────────────────────────

describe('truncateMessage', () => {
  it('truncates message exceeding 4096 characters', () => {
    const longMessage = 'MyKek\n\n' + 'A'.repeat(5000);
    const result = truncateMessage(longMessage);
    expect(result.length).toBeLessThanOrEqual(4096);
  });

  it('does not modify messages within limit', () => {
    const shortMessage = 'MyKek\n\nHai Ahmad, ini mesej pendek.';
    expect(truncateMessage(shortMessage)).toBe(shortMessage);
  });
});

// ─── Property-Based Tests ──────────────────────────────────────────

describe('Property-Based Tests', () => {
  /**
   * **Validates: Requirements 6.3**
   * Property 10: For any non-negative number, formatCurrency produces "RM" prefix with 2 decimal places
   */
  describe('formatCurrency property', () => {
    it('produces "RM " prefix and 2 decimal places for any non-negative number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 999999.99, noNaN: true }),
          (amount) => {
            const result = formatCurrency(amount);
            // Must start with "RM "
            expect(result.startsWith('RM ')).toBe(true);
            // Must end with exactly 2 decimal places
            const decimalMatch = result.match(/\.(\d+)$/);
            expect(decimalMatch).not.toBeNull();
            expect(decimalMatch[1]).toHaveLength(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Validates: Requirements 6.4**
   * Property 11: For any valid Date, formatDate produces DD/MM/YYYY pattern
   */
  describe('formatDate property', () => {
    it('produces DD/MM/YYYY pattern for any valid date', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (date) => {
            const result = formatDate(date);
            // Must match DD/MM/YYYY pattern
            const match = result.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            expect(match).not.toBeNull();
            // Day should be 01-31
            const day = parseInt(match[1], 10);
            expect(day).toBeGreaterThanOrEqual(1);
            expect(day).toBeLessThanOrEqual(31);
            // Month should be 01-12
            const month = parseInt(match[2], 10);
            expect(month).toBeGreaterThanOrEqual(1);
            expect(month).toBeLessThanOrEqual(12);
            // Year should be 4 digits
            expect(match[3]).toHaveLength(4);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
