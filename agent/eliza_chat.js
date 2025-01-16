import readline from 'readline';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
let tavilyApiKey = process.env.TAVILY_API_KEY;

class ElizaChatInterface {
    constructor() {
        this.mainReadline = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        console.log('ElizaChatInterface initialized');

        // Track conversation state
        this.conversationStarted = false;

        // Color formatting for terminal output
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            underscore: '\x1b[4m',
            blink: '\x1b[5m',
            reverse: '\x1b[7m',
            hidden: '\x1b[8m',

            // Foreground colors
            black: '\x1b[30m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
        };

        // Web search triggers
        this.searchTriggers = [
            '/search', 
            '/web', 
            '!search', 
            'find information about',
            'search the web for',
            'lookup',
            'what can you find about'
        ];

        // Load Tavily API key from environment
        this.tavilyApiKey = tavilyApiKey;
    }

    // Prompt for API key securely
    async promptForAPIKey() {
        return new Promise((resolve, reject) => {
            console.log('\n🔐 OpenAI API Key is required to use this chat interface.');
            console.log('You can obtain an API key from https://platform.openai.com/account/api-keys\n');
            
            this.mainReadline.question('Enter your OpenAI API Key: ', (key) => {
                // Basic validation
                if (!key || key.trim().length < 20) {
                    console.error('❌ Invalid API key. Please try again.');
                    this.mainReadline.close();
                    reject(new Error('Invalid API key'));
                    return;
                }

                // Attempt to save to .env file
                try {
                    const envPath = path.join(__dirname, '.env');
                    fs.writeFileSync(envPath, `OPENAI_API_KEY=${key.trim()}`, 'utf8');
                    console.log('✅ API key saved securely.');
                } catch (error) {
                    console.warn('⚠️ Could not save API key to .env file. You may need to re-enter it next time.');
                }

                resolve(key.trim());
            });
        });
    }

    // Initialize OpenAI with key
    async initializeOpenAI() {
        // If no key is set, prompt for it
        if (!OPENAI_API_KEY) {
            try {
                OPENAI_API_KEY = await this.promptForAPIKey();
            } catch (error) {
                console.error('Failed to obtain API key. Exiting.');
                process.exit(1);
            }
        }

        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        // Conversation history for context
        this.conversationHistory = [
            {
                role: 'system', 
                content: `You are Eliza, a friendly and intelligent AI assistant. 
                You can engage in conversation, answer questions, and help with various tasks. 
                Be warm, helpful, and show personality while remaining professional.`
            }
        ];
    }

    // Check if message is a web search
    isWebSearch(message) {
        return this.searchTriggers.some(trigger => 
            message.toLowerCase().includes(trigger.toLowerCase())
        );
    }

    // Extract query by removing trigger
    extractSearchQuery(message) {
        for (let trigger of this.searchTriggers) {
            if (message.toLowerCase().includes(trigger.toLowerCase())) {
                return message.replace(new RegExp(trigger, 'i'), '').trim();
            }
        }
        return message;
    }

    // Perform web search using Tavily API
    async performWebSearch(query) {
        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.tavilyApiKey}`
                },
                body: JSON.stringify({
                    query: query,
                    max_results: 5,
                    include_answer: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`${this.colors.red}Search Error:${this.colors.reset}`, error);
            return null;
        }
    }

    // Format search results
    formatSearchResults(searchResults) {
        // Ensure we have search results
        if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
            return `🔍 No search results found for "${searchResults?.query || 'the query'}"`;
        }

        // Create a formatted response
        let output = `🌐 Web Search Results for "${searchResults.query}"\n\n`;

        // Direct answer
        if (searchResults.answer) {
            output += `📌 Key Insights:\n${searchResults.answer}\n\n`;
        }

        // Detailed results
        output += `🔍 Top Sources:\n`;
        searchResults.results.slice(0, 5).forEach((result, index) => {
            output += `\n${index + 1}. ${result.title}\n`;
            output += `   🔗 URL: ${result.url}\n`;
            output += `   📄 Snippet: ${result.content.slice(0, 250)}${result.content.length > 250 ? '...' : ''}\n`;
        });

        // Additional context
        output += `\n💡 Search Details:\n`;
        output += `- Total Sources: ${searchResults.results.length}\n`;
        output += `- Powered by Tavily AI\n`;

        return output;
    }

    // Helper method to truncate URLs (used in terminal output)
    truncateUrl(url, maxLength = 50) {
        try {
            const parsedUrl = new URL(url);
            const domain = parsedUrl.hostname.replace('www.', '');
            const path = parsedUrl.pathname.length > 20 
                ? parsedUrl.pathname.slice(0, 20) + '...' 
                : parsedUrl.pathname;
            
            return `${domain}${path}`;
        } catch {
            return url.length > maxLength 
                ? url.slice(0, maxLength) + '...' 
                : url;
        }
    }

    // New method for AI chat response
    async generateChatResponse(input) {
        try {
            // First interaction greeting
            if (!this.conversationStarted) {
                this.conversationStarted = true;
                return "Hello! I'm Eliza, your AI assistant. How can I help you today?";
            }

            // Add user message to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: input
            });

            try {
                // Attempt OpenAI response first
                const completion = await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: this.conversationHistory,
                    max_tokens: 150
                });

                const aiResponse = completion.choices[0].message.content;

                // Add AI response to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: aiResponse
                });

                return aiResponse;
            } catch (openaiError) {
                console.warn('OpenAI API Error:', openaiError.message);
                
                // Fallback to web search if OpenAI fails
                const searchResults = await this.performWebSearch(input);
                
                if (searchResults && searchResults.results.length) {
                    return searchResults.answer || 
                           `I couldn't generate a direct response, but here's some relevant information:\n\n` + 
                           searchResults.results.map(r => `• ${r.title}: ${r.content.slice(0, 200)}...`).join('\n');
                }

                // Ultimate fallback
                return "I'm having trouble generating a response right now. Would you like to try a web search?";
            }
        } catch (error) {
            console.error('Chat generation error:', error);
            return "I'm having trouble generating a response right now.";
        }
    }

    // Modify input handling
    async handleInput(input) {
        try {
            // Check if input is a web search
            if (this.isWebSearch(input)) {
                const query = this.extractSearchQuery(input);
                console.log(`${this.colors.magenta}🔎 Searching for: "${query}"${this.colors.reset}`);

                const searchResults = await this.performWebSearch(query);
                
                if (searchResults && searchResults.results.length) {
                    const formattedResults = this.formatSearchResults(searchResults);
                    console.log(formattedResults);
                    return formattedResults;
                } else {
                    const noResultMessage = `${this.colors.red}❌ No results found for "${query}".${this.colors.reset}`;
                    console.log(noResultMessage);
                    return noResultMessage;
                }
            } else {
                // Generate AI chat response
                const aiResponse = await this.generateChatResponse(input);
                console.log(`${this.colors.green}💬 Eliza:${this.colors.reset} ${aiResponse}`);
                return aiResponse;
            }
        } catch (error) {
            const errorMessage = `${this.colors.red}Error processing your request:${this.colors.reset} ${error.message}`;
            console.error(errorMessage);
            return errorMessage;
        }
    }

    // Modify start method to initialize OpenAI first
    async start(mode = 'terminal') {
        await this.initializeOpenAI();
    
        if (mode === 'terminal') {
            console.log(`${this.colors.bright}${this.colors.cyan}
    ╔══════════════════════════════════════╗
    ║       Eliza Chat Interface          ║
    ╚══════════════════════════════════════╝
    ${this.colors.reset}`);
            console.log(`${this.colors.yellow}Web Search Triggers: ${this.searchTriggers.join(', ')}${this.colors.reset}\n`);
            console.log(`${this.colors.green}Type your message or use a web search trigger.${this.colors.reset}`);
            console.log(`${this.colors.green}Type 'exit' to quit.${this.colors.reset}\n`);
    
            const askQuestion = () => {
                this.mainReadline.question(`${this.colors.blue}You:${this.colors.reset} `, async (input) => {
                    if (input.toLowerCase() === 'exit') {
                        console.log(`${this.colors.yellow}Goodbye!${this.colors.reset}`);
                        this.mainReadline.close();
                        return;
                    }
    
                    await this.handleInput(input);
                    askQuestion(); // Continue the conversation loop
                });
            };
    
            askQuestion();
        }
    
        return this; // Return the instance for chaining or further configuration
    }
}

// Run the chat interface
async function main() {
    console.log('Starting Eliza Chat Interface');
    const elizaChat = new ElizaChatInterface();
    await elizaChat.start();
}

// Only run if directly executed
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { ElizaChatInterface as default };
