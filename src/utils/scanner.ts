export type Severity = 'critical' | 'medium' | 'low';

export interface ScanResult {
  filePath: string;
  lineNumber: number;
  matchedText: string;
  severity: Severity;
}

export const getSeverity = (filePath: string, text: string, oldUsername: string): Severity => {
  const lowerPath = filePath.toLowerCase();
  
  // Package registry refs / manifest files
  if (
    lowerPath.endsWith('package.json') ||
    lowerPath.endsWith('pyproject.toml') ||
    lowerPath.endsWith('cargo.toml') ||
    lowerPath.endsWith('go.mod')
  ) {
    return 'critical';
  }

  // CODEOWNERS
  if (lowerPath.includes('codeowners')) {
    return 'critical';
  }

  // CI Configs
  if (lowerPath.includes('.github/workflows/') && (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml'))) {
    return 'critical';
  }

  // Raw githubusercontent links can break builds
  if (text.includes(`raw.githubusercontent.com/${oldUsername}`)) {
    return 'critical';
  }

  // READMEs / Badges
  if (lowerPath.includes('readme')) {
    return 'medium';
  }

  // Default to low for comments/docs
  return 'low';
};

export const scanFileContent = (filePath: string, content: string, oldUsername: string): ScanResult[] => {
  const results: ScanResult[] = [];
  const lines = content.split('\n');
  
  // Escape the username for regex
  const escapedUsername = oldUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match the username exactly, ensuring it's not part of a larger word or hyphenated string.
  const regexPattern = new RegExp(`(?<![a-zA-Z0-9-])${escapedUsername}(?![a-zA-Z0-9-])`, 'gi');

  lines.forEach((line, index) => {
    regexPattern.lastIndex = 0; // reset
    if (regexPattern.test(line)) {
      results.push({
        filePath,
        lineNumber: index + 1,
        // Keep the matched line, but truncate if it's absurdly long
        matchedText: line.trim().length > 120 ? line.trim().substring(0, 117) + '...' : line.trim(),
        severity: getSeverity(filePath, line, oldUsername),
      });
    }
  });

  return results;
};
