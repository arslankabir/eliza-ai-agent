import readline from 'readline';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function performWebSearch(query) {
    try {
        console.log(`🔍 Searching for: "${query}"`);
        
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                max_results: 5,
                include_answer: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const searchResults = await response.json();
        
        if (searchResults.results && searchResults.results.length > 0) {
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
        console.error('Search failed:', error.message);
    }
}

// Interactive search
async function main() {
    console.log("🌐 Tavily Web Search Demo");
    console.log("Enter your search query or type 'exit' to quit.\n");

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askQuestion = (query) => new Promise(resolve => 
        rl.question(`${query} `, resolve)
    );

    while (true) {
        const userQuery = await askQuestion("Search query:");
        
        if (userQuery.toLowerCase() === 'exit') {
            break;
        }

        await performWebSearch(userQuery);
    }

    rl.close();
    console.log("\n👋 Thank you for using Tavily Web Search Demo!");
}

// Run the demo if this file is directly executed
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { performWebSearch };
