# Eliza AI Agent

## Project Overview
Eliza is an advanced AI-powered chat interface combining natural language processing, web search, and intelligent response generation.

## Prerequisites
- Python 3.8+
- Node.js 16+
- npm 8+

## Setup and Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/eliza-ai-agent.git
cd eliza-ai-agent
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install backend dependencies
pip install -r requirements.txt
```

### 3. Install Dependencies

#### Backend Dependencies
```bash
# In agent directory
cd agent
pip install -r requirements.txt
```

#### Frontend Dependencies
```bash
# In client directory
cd client
npm install
```

### 4. Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in your API keys for OpenAI and Tavily

### 5. Run the Application

#### Start Backend
```bash
# In agent directory
python chat_api.py
```

#### Start Frontend
```bash
# In client directory
npm start
```

## Monorepo Package Management

### Project Structure
This is a monorepo containing multiple packages:
- `packages/`: Contains various plugins and adapters
- `client/`: Frontend application
- `agent/`: Backend services

### Installing Dependencies

#### Root-level Dependencies
```bash
# Install root-level dependencies
npm install
```

#### Package-specific Dependencies
To install dependencies for specific packages:
```bash
# Install dependencies for a specific package
cd packages/[package-name]
npm install
```

#### Quick Install for All Packages
```bash
# Install dependencies for all packages
npm run bootstrap  # If using Lerna or Yarn Workspaces
# or
npm run install:all  # Custom script in package.json
```

### Working with Packages

#### Listing Available Packages
```bash
# List all available packages
ls packages/
```

#### Adding a New Package
1. Create a new directory in `packages/`
2. Initialize with `npm init`
3. Add to monorepo configuration

#### Updating Packages
```bash
# Update dependencies across all packages
npm run update:packages
```

### Troubleshooting
- Ensure you're using the Node.js version specified in `.nvmrc`
- If encountering dependency issues, try clearing npm cache:
  ```bash
  npm cache clean --force
  ```

### Plugin Development
- Each plugin in `packages/` is a standalone module
- Develop and test plugins independently
- Ensure compatibility with the core Eliza framework

## Features
- Real-time WebSocket communication
- Intelligent web search
- OpenAI GPT integration
- Dynamic conversational AI

## Troubleshooting
- Ensure all API keys are valid
- Check network connectivity
- Verify dependency versions

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License

## Contact
Arsalan Kabeer
- Email: arsalan.kabeer@example.com
