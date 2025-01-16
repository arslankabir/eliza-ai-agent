import ElizaChatInterface from './eliza_chat.js';
process.env.NODE_OPTIONS = '--no-warnings'

async function main() {
    console.log('Launching Eliza Chat Interface');
    const elizaChat = new ElizaChatInterface();
    await elizaChat.start('terminal');
}

main().catch(console.error);
