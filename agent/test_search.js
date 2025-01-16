const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function performWebSearch(query) {
    console.log('Starting search...');
    try {
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

        console.log('Response received');
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const searchResults = await response.json();
        console.log('Search results:', JSON.stringify(searchResults, null, 2));
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Run a test search
performWebSearch('Latest AI news');
