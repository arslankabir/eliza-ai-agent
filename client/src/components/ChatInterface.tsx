import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ChatInterface.css';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_CONNECTION_ATTEMPTS = 5;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = useCallback(() => {
    // Prevent excessive reconnection attempts
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error('Max connection attempts reached. Please check server status.');
      return;
    }

    console.log(`Attempting WebSocket connection (Attempt ${connectionAttempts + 1})`);
    
    try {
      // Try multiple connection methods
      const connectionUrls = [
        'ws://127.0.0.1:3000',
        'ws://localhost:3000'
      ];

      const attemptConnection = (urls: string[]) => {
        if (urls.length === 0) {
          console.error('All WebSocket connection attempts failed');
          setIsConnected(false);
          setConnectionAttempts(prev => prev + 1);
          return;
        }

        const url = urls[0];
        console.log(`Attempting connection to: ${url}`);

        const ws = new WebSocket(url);
        socketRef.current = ws;

        // Timeout to handle connection issues
        const connectionTimeout = setTimeout(() => {
          console.warn(`Connection to ${url} timed out`);
          ws.close();
          if (urls.length > 1) {
            attemptConnection(urls.slice(1));
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket Connected successfully to ${url}`);
          setIsConnected(true);
          setConnectionAttempts(0);  // Reset connection attempts on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);

            // Handle different message types
            if (data.response) {
              // Regular chat or search response
              addMessage(data.response, 'ai');
            } else {
              // Fallback for unexpected message format
              addMessage(event.data, 'ai');
            }
          } catch (error) {
            // If not JSON, treat as plain text
            console.log('Received non-JSON message:', event.data);
            addMessage(event.data, 'ai');
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket Error Details:', {
            type: error.type,
            url,
            error: error,
            target: error.target,
            currentTarget: error.currentTarget
          });
          setIsConnected(false);
          
          // Try next URL if available
          if (urls.length > 1) {
            attemptConnection(urls.slice(1));
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket Disconnected', {
            url,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          setIsConnected(false);
          
          // Exponential backoff for reconnection
          const reconnectDelay = Math.min(5000 * (connectionAttempts + 1), 30000);
          setTimeout(() => {
            if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
              connectWebSocket();
            }
          }, reconnectDelay);
        };
      };

      attemptConnection(connectionUrls);
    } catch (error) {
      console.error('WebSocket Connection Initialization Error:', error);
      setConnectionAttempts(prev => prev + 1);
      
      // Exponential backoff for reconnection
      const reconnectDelay = Math.min(5000 * (connectionAttempts + 1), 30000);
      setTimeout(connectWebSocket, reconnectDelay);
    }
  }, [connectionAttempts, MAX_CONNECTION_ATTEMPTS]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      socketRef.current?.close();
    };
  }, [connectWebSocket]);

  const addMessage = useCallback((text: string, sender: 'user' | 'ai') => {
    setMessages(prevMessages => [
      ...prevMessages,
      { id: Date.now(), text, sender }
    ]);
  }, []);

  const formatSearchResultMessage = (searchData: any): string => {
    // No results case
    if (searchData.status === 'no_results') {
      return `No results found for the query: "${searchData.query}"`;
    }

    // Construct a readable search result message
    let resultMessage = `🌐 Web Search Results for "${searchData.query}"\n\n`;

    // Add direct insights if available
    if (searchData.directInsights) {
      resultMessage += `📌 Key Insights:\n${searchData.directInsights}\n\n`;
    }

    // Add sources
    resultMessage += `🔍 Top Sources:\n`;
    searchData.sources.forEach((source: any) => {
      resultMessage += `\n${source.rank}. ${source.title}\n`;
      resultMessage += `   🌐 Domain: ${source.domain}\n`;
      resultMessage += `   🔗 URL: ${source.url}\n`;
      resultMessage += `   📄 Snippet: ${source.snippet}\n`;
      resultMessage += `   ⭐ Relevance: ${source.relevanceScore}%\n`;
    });

    // Add metadata
    resultMessage += `\n💡 Search Metadata:\n`;
    resultMessage += `Total Sources: ${searchData.metadata.totalSources}\n`;
    resultMessage += `Search Engine: ${searchData.metadata.searchEngine}\n`;
    resultMessage += `Timestamp: ${new Date(searchData.metadata.timestamp).toLocaleString()}\n`;

    return resultMessage;
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    addMessage(inputMessage, 'user');

    // Send message via WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(inputMessage);
    } else {
      addMessage('Sorry, I\'m not connected right now. Please wait while I reconnect...', 'ai');
      console.warn('WebSocket is not open. Current state:', socketRef.current?.readyState);
      connectWebSocket();
    }

    // Clear input
    setInputMessage('');
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>Eliza Web Search AI Assistant Developed by AK</h2>
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : `Reconnecting... (Attempt ${connectionAttempts + 1})`}
        </span>
      </div>
      <div className="messages">
        {messages.map(message => (
          <div 
            key={message.id} 
            className={`message ${message.sender}`}
          >
            {message.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <input 
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
