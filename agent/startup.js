import fs from 'fs';
import path from 'path';
import winston from 'winston';
import franc from 'franc';

// Import the web search plugin
import { webSearch } from '@elizaos/plugin-web-search';
process.env.NODE_OPTIONS = '--no-warnings'

// Tavily API Configuration
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || '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';

// Logging Setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
            filename: path.join(process.cwd(), 'logs', 'web-search-agent.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        })
    ]
});

export class WebSearchAgent {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        process.on('unhandledRejection', (reason, promise) => {
            logger.error(`Unhandled Rejection: ${reason}`);
        });

        process.on('uncaughtException', (error) => {
            logger.error(`Uncaught Exception: ${error.message}`);
            process.exit(1);
        });
    }

    // Wrapper method to use the imported web search plugin
    async performWebSearch(query, runtime) {
        return new Promise((resolve, reject) => {
            const mockRuntime = {
                getSetting: (key) => {
                    if (key === 'TAVILY_API_KEY') return this.apiKey;
                    return null;
                },
                agentId: 'web-search-agent'
            };

            const mockMessage = {
                content: { text: query }
            };

            const mockState = {};

            webSearch.handler(
                mockRuntime, 
                mockMessage, 
                mockState, 
                {}, 
                (response) => {
                    resolve({
                        query: query,
                        text: response.text
                    });
                }
            ).catch(reject);
        });
    }

    async interactiveSearch() {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = (query) => new Promise(resolve => 
            rl.question(`\n${query} (or 'exit' to quit): `, resolve)
        );

        while (true) {
            const userQuery = await askQuestion("Enter your web search query");
            
            if (userQuery.toLowerCase() === 'exit') {
                break;
            }

            try {
                const searchResults = await this.performWebSearch(userQuery);
                console.log('\n' + searchResults.text);
            } catch (error) {
                console.error('Search failed:', error);
            }
        }

        rl.close();
    }
}

async function main() {
    try {
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)){
            fs.mkdirSync(logsDir);
        }

        if (!TAVILY_API_KEY) {
            logger.error("TAVILY_API_KEY is not set!");
            process.exit(1);
        }

        const webSearchAgent = new WebSearchAgent(TAVILY_API_KEY);
        logger.info("Web Search Agent initialized successfully");
        
        await webSearchAgent.interactiveSearch();

    } catch (error) {
        logger.error("Agent startup failed: " + error.message);
        process.exit(1);
    }
}

// Run the agent if this file is directly executed
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(logger.error);
}

export const createWebSearchAgent = (apiKey) => new WebSearchAgent(apiKey || TAVILY_API_KEY);
