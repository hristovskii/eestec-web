import { describe, expect, it } from 'vitest';

import { cleanFileName, cvPickProblem, formatFileSize, isPdf } from './cv';

describe('CV rules', () => {
  it('takes a PDF up to 5 MB and says what is wrong otherwise', () => {
    expect(cvPickProblem({ type: 'application/pdf', size: 240_000 })).toBeNull();
    expect(cvPickProblem({ type: 'application/pdf', size: 5_000_000 })).toBeNull();
    expect(cvPickProblem({ type: 'application/pdf', size: 5_000_001 })).toBe('cvSize');
    expect(cvPickProblem({ type: 'application/pdf', size: 0 })).toBe('cvSize');
    expect(
      cvPickProblem({
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 100,
      }),
    ).toBe('cvType');
    expect(cvPickProblem({ type: '', size: 100 })).toBe('cvType');
  });

  it('knows a PDF by its first bytes', () => {
    expect(isPdf(new TextEncoder().encode('%PDF-1.7 ...'))).toBe(true);
    expect(isPdf(new TextEncoder().encode('PK\u0003\u0004'))).toBe(false);
    expect(isPdf(new Uint8Array([37, 80]))).toBe(false);
  });

  it('cleans the file name: no folders, no control characters, always .pdf, not too long', () => {
    expect(cleanFileName('Marija_CV.pdf')).toBe('Marija_CV.pdf');
    expect(cleanFileName('C:\\Users\\me\\CV final.PDF')).toBe('CV final.PDF');
    expect(cleanFileName('../../etc/passwd')).toBe('passwd.pdf');
    expect(cleanFileName('a\u0000b\nc.pdf')).toBe('abc.pdf');
    expect(cleanFileName('')).toBe('CV.pdf');
    const long = cleanFileName(`${'x'.repeat(300)}.pdf`);
    expect(long.length).toBe(120);
    expect(long.endsWith('.pdf')).toBe(true);
  });

  it('shows sizes in KB and MB', () => {
    expect(formatFileSize(240 * 1024)).toBe('240 KB');
    expect(formatFileSize(10)).toBe('1 KB');
    expect(formatFileSize(1_250_000)).toBe('1.3 MB');
  });
});
