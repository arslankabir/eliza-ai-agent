import { generateWebSearch } from '@elizaos/core';

async function performWebSearch(query) {
    try {
        // Mock runtime object
        const mockRuntime = {
            getSetting: (key) => {
                if (key === 'TAVILY_API_KEY') return process.env.TAVILY_API_KEY || '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';
                return null;
            }
        };

        console.log(`🔍 Searching for: "${query}"`);
        
        const searchResults = await generateWebSearch(query, mockRuntime);
        
        if (searchResults && searchResults.results.length > 0) {
            console.log('\n📌 Direct Answer:');
            console.log(searchResults.answer || 'No direct answer found.');
            
            console.log('\n🌐 Search Results:');
            searchResults.results.forEach((result, index) => {
                console.log(`\nResult ${index + 1}:`);
                console.log(`Title: ${result.title}`);
                console.log(`URL: ${result.url}`);
                console.log(`Snippet: ${result.content.slice(0, 250)}...`);
            });
        } else {
            console.log('No results found.');
        }
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Interactive search
async function main() {
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

        await performWebSearch(userQuery);
    }

    rl.close();
}

// Run the demo if this file is directly executed
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { performWebSearch };
