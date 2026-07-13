"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanFileContent = exports.getSeverity = void 0;
const getSeverity = (filePath, text, oldUsername) => {
    const lowerPath = filePath.toLowerCase();
    // Package registry refs / manifest files
    if (lowerPath.endsWith('package.json') ||
        lowerPath.endsWith('pyproject.toml') ||
        lowerPath.endsWith('cargo.toml') ||
        lowerPath.endsWith('go.mod')) {
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
exports.getSeverity = getSeverity;
const scanFileContent = (filePath, content, oldUsername) => {
    const results = [];
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
                severity: (0, exports.getSeverity)(filePath, line, oldUsername),
            });
        }
    });
    return results;
};
exports.scanFileContent = scanFileContent;
