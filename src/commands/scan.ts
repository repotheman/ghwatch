import { getOctokit, withRateLimitHandling } from '../utils/github';
import { scanFileContent, ScanResult } from '../utils/scanner';
import chalk from 'chalk';
import Table from 'cli-table3';

interface ScanOptions {
  repo?: string;
  json?: boolean;
}

export const scanCommand = async (oldUsername: string, newUsername: string, options: ScanOptions) => {
  const octokit = getOctokit();
  
  let reposToScan: { owner: string; repo: string }[] = [];

  if (options.repo) {
    const parts = options.repo.split('/');
    if (parts.length !== 2) {
      console.error(chalk.red('Error: --repo must be in the format owner/repo'));
      process.exit(1);
    }
    reposToScan.push({ owner: parts[0], repo: parts[1] });
  } else {
    if (!options.json) console.log(chalk.blue('Fetching repositories...'));
    try {
      const repos = await withRateLimitHandling(() => octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated'
      }));
      reposToScan = repos.data.map(r => ({ owner: r.owner.login, repo: r.name }));
    } catch (error: any) {
      console.error(chalk.red('Failed to fetch repositories:'), error.message);
      process.exit(1);
    }
  }

  const allResults: (ScanResult & { repository: string })[] = [];

  for (const { owner, repo } of reposToScan) {
    if (!options.json) console.log(chalk.gray(`Scanning ${owner}/${repo}...`));
    try {
      const repoInfo = await withRateLimitHandling(() => octokit.repos.get({ owner, repo }));
      const defaultBranch = repoInfo.data.default_branch;

      const treeResponse = await withRateLimitHandling(() => octokit.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: '1'
      }));

      // Filter files that are likely to contain references to avoid rate limiting on massive repos
      const targetPaths = treeResponse.data.tree.filter(item => {
        if (item.type !== 'blob' || !item.path) return false;
        const lowerPath = item.path.toLowerCase();
        return (
          lowerPath.includes('readme') ||
          lowerPath.endsWith('package.json') ||
          lowerPath.endsWith('pyproject.toml') ||
          lowerPath.endsWith('cargo.toml') ||
          lowerPath.endsWith('go.mod') ||
          lowerPath.includes('codeowners') ||
          (lowerPath.includes('.github/workflows/') && (lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml'))) ||
          lowerPath.endsWith('.md')
        );
      });

      for (const item of targetPaths) {
        const blobResponse = await withRateLimitHandling(() => octokit.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!
        }));
        
        const content = Buffer.from(blobResponse.data.content, 'base64').toString('utf8');
        const fileResults = scanFileContent(item.path!, content, oldUsername);
        
        fileResults.forEach(r => {
          allResults.push({ ...r, repository: `${owner}/${repo}` });
        });
      }
    } catch (error: any) {
      // 409 means repository is empty
      if (error.status !== 409 && !options.json) {
        console.warn(chalk.yellow(`Warning: Failed to scan ${owner}/${repo}: ${error.message}`));
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify(allResults, null, 2));
    return;
  }

  if (allResults.length === 0) {
    console.log(chalk.green(`\nNo references to '${oldUsername}' found. Good job!`));
    return;
  }

  console.log(chalk.red(`\nFound ${allResults.length} references to '${oldUsername}':\n`));

  const table = new Table({
    head: ['Repository', 'File', 'Line', 'Severity', 'Match'],
    style: { head: ['cyan'] },
    wordWrap: true,
    colWidths: [20, 30, 8, 12, 50]
  });

  allResults.forEach(res => {
    let severityColored: string = res.severity;
    if (res.severity === 'critical') severityColored = chalk.red('critical');
    else if (res.severity === 'medium') severityColored = chalk.yellow('medium');
    else severityColored = chalk.gray('low');

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
