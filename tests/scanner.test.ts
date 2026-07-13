import { describe, it, expect } from 'vitest';
import { getSeverity, scanFileContent } from '../src/utils/scanner';

describe('scanner utility', () => {
  describe('getSeverity', () => {
    it('returns critical for package.json', () => {
      expect(getSeverity('package.json', '{}', 'old')).toBe('critical');
    });

    it('returns critical for CODEOWNERS', () => {
      expect(getSeverity('.github/CODEOWNERS', '* @old', 'old')).toBe('critical');
    });

    it('returns critical for GitHub Actions workflows', () => {
      expect(getSeverity('.github/workflows/ci.yml', 'run: echo old', 'old')).toBe('critical');
    });

    it('returns critical for raw.githubusercontent.com links', () => {
      expect(getSeverity('random.txt', 'https://raw.githubusercontent.com/old/repo/main/file.txt', 'old')).toBe('critical');
    });

    it('returns medium for README files', () => {
      expect(getSeverity('README.md', 'Check out my repo', 'old')).toBe('medium');
    });

    it('returns low for random files without special URLs', () => {
      expect(getSeverity('src/index.ts', 'const x = "old";', 'old')).toBe('low');
    });
  });

  describe('scanFileContent', () => {
    it('finds exact username matches with word boundaries', () => {
      const content = 'Hello old-user\nThis is old-user/repo\nCheckout old-user2/repo';
      const results = scanFileContent('test.md', content, 'old-user');
      
      expect(results.length).toBe(2);
      expect(results[0].lineNumber).toBe(1);
      expect(results[1].lineNumber).toBe(2);
      expect(results[0].matchedText).toBe('Hello old-user');
    });

    it('ignores partial matches inside other words', () => {
      const content = 'This is my-old-username\nThis is old-user\nThis is old-user-new';
      const results = scanFileContent('test.md', content, 'old-user');
      
      expect(results.length).toBe(1);
      expect(results[0].lineNumber).toBe(2);
    });

    it('truncates very long lines', () => {
      const longLine = 'a'.repeat(150) + ' old-user ' + 'b'.repeat(100);
      const results = scanFileContent('test.md', longLine, 'old-user');
      
      expect(results[0].matchedText.length).toBeLessThan(longLine.length);
      expect(results[0].matchedText.endsWith('...')).toBe(true);
    });
  });
});
