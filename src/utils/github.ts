import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

export const getOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(chalk.red('Error: GITHUB_TOKEN environment variable is required. Please check your .env file.'));
    process.exit(1);
  }
  return new Octokit({ auth: token });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps an API call to handle GitHub rate limiting automatically.
 */
export const withRateLimitHandling = async <T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let retries = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error: any) {
      if (error.status === 403 || error.status === 429) {
        const resetHeader = error.response?.headers['x-ratelimit-reset'];
        let waitTimeMs = 5000;
        
        if (resetHeader) {
          const resetTime = parseInt(resetHeader, 10) * 1000;
          waitTimeMs = Math.max(resetTime - Date.now(), 5000);
        }

        if (retries < maxRetries) {
          console.warn(chalk.yellow(`Rate limit hit. Waiting ${Math.ceil(waitTimeMs / 1000)} seconds before retrying...`));
          await delay(waitTimeMs + 1000); // 1s buffer
          retries++;
          continue;
        }
      }
      throw error;
    }
  }
};
