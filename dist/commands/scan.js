"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanCommand = void 0;
const github_1 = require("../utils/github");
const scanner_1 = require("../utils/scanner");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const scanCommand = async (oldUsername, newUsername, options) => {
    const octokit = (0, github_1.getOctokit)();
    let reposToScan = [];
    if (options.repo) {
        const parts = options.repo.split('/');
        if (parts.length !== 2) {
            console.error(chalk_1.default.red('Error: --repo must be in the format owner/repo'));
            process.exit(1);
        }
        reposToScan.push({ owner: parts[0], repo: parts[1] });
    }
    else {
        if (!options.json)
            console.log(chalk_1.default.blue('Fetching repositories...'));
        try {
            const repos = await (0, github_1.withRateLimitHandling)(() => octokit.repos.listForAuthenticatedUser({
                per_page: 100,
                sort: 'updated'
            }));
            reposToScan = repos.data.map(r => ({ owner: r.owner.login, repo: r.name }));
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to fetch repositories:'), error.message);
            process.exit(1);
        }
    }
    const allResults = [];
    for (const { owner, repo } of reposToScan) {
        if (!options.json)
            console.log(chalk_1.default.gray(`Scanning ${owner}/${repo}...`));
        try {
            const repoInfo = await (0, github_1.withRateLimitHandling)(() => octokit.repos.get({ owner, repo }));
            const defaultBranch = repoInfo.data.default_branch;
            const treeResponse = await (0, github_1.withRateLimitHandling)(() => octokit.git.getTree({
                owner,
                repo,
                tree_sha: defaultBranch,
                recursive: '1'
            }));
            // Filter files that are likely to contain references to avoid rate limiting on massive repos
            const targetPaths = treeResponse.data.tree.filter(item => {
                if (item.type !== 'blob' || !item.path)
                    return false;
                const lowerPath = item.path.toLowerCase();
                return (lowerPath.includes('readme') ||
                    lowerPath.endsWith('package.json') ||
                    lowerPath.endsWith('pyproject.toml') ||
                    lowerPath.endsWith('cargo.toml') ||
                    lowerPath.endsWith('go.mod') ||
                    lowerPath.includes('codeowners') ||
                    (lowerPath.includes('.github/workflows/') && (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml'))) ||
                    lowerPath.endsWith('.md'));
            });
            for (const item of targetPaths) {
                const blobResponse = await (0, github_1.withRateLimitHandling)(() => octokit.git.getBlob({
                    owner,
                    repo,
                    file_sha: item.sha
                }));
                const content = Buffer.from(blobResponse.data.content, 'base64').toString('utf8');
                const fileResults = (0, scanner_1.scanFileContent)(item.path, content, oldUsername);
                fileResults.forEach(r => {
                    allResults.push({ ...r, repository: `${owner}/${repo}` });
                });
            }
        }
        catch (error) {
            // 409 means repository is empty
            if (error.status !== 409 && !options.json) {
                console.warn(chalk_1.default.yellow(`Warning: Failed to scan ${owner}/${repo}: ${error.message}`));
            }
        }
    }
    if (options.json) {
        console.log(JSON.stringify(allResults, null, 2));
        return;
    }
    if (allResults.length === 0) {
        console.log(chalk_1.default.green(`\nNo references to '${oldUsername}' found. Good job!`));
        return;
    }
    console.log(chalk_1.default.red(`\nFound ${allResults.length} references to '${oldUsername}':\n`));
    const table = new cli_table3_1.default({
        head: ['Repository', 'File', 'Line', 'Severity', 'Match'],
        style: { head: ['cyan'] },
        wordWrap: true,
        colWidths: [20, 30, 8, 12, 50]
    });
    allResults.forEach(res => {
        let severityColored = res.severity;
        if (res.severity === 'critical')
            severityColored = chalk_1.default.red('critical');
        else if (res.severity === 'medium')
            severityColored = chalk_1.default.yellow('medium');
        else
            severityColored = chalk_1.default.gray('low');
        table.push([
            res.repository,
            res.filePath,
            res.lineNumber.toString(),
            severityColored,
            res.matchedText
        ]);
    });
    console.log(table.toString());
};
exports.scanCommand = scanCommand;
