"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRateLimitHandling = exports.getOctokit = void 0;
const rest_1 = require("@octokit/rest");
const dotenv_1 = __importDefault(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
dotenv_1.default.config();
const getOctokit = () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error(chalk_1.default.red('Error: GITHUB_TOKEN environment variable is required. Please check your .env file.'));
        process.exit(1);
    }
    return new rest_1.Octokit({ auth: token });
};
exports.getOctokit = getOctokit;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Wraps an API call to handle GitHub rate limiting automatically.
 */
const withRateLimitHandling = async (apiCall, maxRetries = 3) => {
    let retries = 0;
    while (true) {
        try {
            return await apiCall();
        }
        catch (error) {
            if (error.status === 403 || error.status === 429) {
                const resetHeader = error.response?.headers['x-ratelimit-reset'];
                let waitTimeMs = 5000;
                if (resetHeader) {
                    const resetTime = parseInt(resetHeader, 10) * 1000;
                    waitTimeMs = Math.max(resetTime - Date.now(), 5000);
                }
                if (retries < maxRetries) {
                    console.warn(chalk_1.default.yellow(`Rate limit hit. Waiting ${Math.ceil(waitTimeMs / 1000)} seconds before retrying...`));
                    await delay(waitTimeMs + 1000); // 1s buffer
                    retries++;
                    continue;
                }
            }
            throw error;
        }
    }
};
exports.withRateLimitHandling = withRateLimitHandling;
