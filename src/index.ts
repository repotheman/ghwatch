#!/usr/bin/env node
import { Command } from 'commander';
import { scanCommand } from './commands/scan';
import { fixCommand } from './commands/fix';
import chalk from 'chalk';

const program = new Command();

program
  .name('ghwatch')
  .description('GitHub Username Change Auditor & Auto-Fixer')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan a user\'s GitHub repos for references to their OLD username')
  .argument('<old-username>', 'The old GitHub username to search for')
  .argument('<new-username>', 'The new GitHub username')
  .option('--repo <repo>', 'Scan a specific repository (e.g. owner/repo) instead of all owned repos')
  .option('--json', 'Output results in JSON format')
  .action(scanCommand);

program
  .command('fix')
  .description('Open auto-fix PRs replacing old references with the new username')
  .argument('<old-username>', 'The old GitHub username to search for')
  .argument('<new-username>', 'The new GitHub username')
  .requiredOption('--repo <repo>', 'The specific repository to fix (e.g. owner/repo)')
  .option('--yes', 'Skip confirmation prompt and immediately open PR')
  .action(fixCommand);

program.parseAsync(process.argv).catch(err => {
  console.error(chalk.red('\nUnexpected Error:'), err.message || err);
  process.exit(1);
});
