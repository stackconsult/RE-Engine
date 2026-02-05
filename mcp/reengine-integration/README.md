# Enhanced Integration Server

Combines LLAMA + Fish API with NEON + SuperBase for a complete real estate intelligence platform.

## Features

- **Persistent Storage**: NEON database with vector search capabilities
- **Multi-user Authentication**: SuperBase auth with real-time collaboration
- **Semantic Search**: Vector-powered property search
- **Real-time Updates**: Live collaboration and notifications
- **File Storage**: Image and document management
- **Market Intelligence**: AI-powered insights and analysis

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

## MCP Tools

- `enhanced_scrape_listings` - Scrape with persistence and AI analysis
- `semantic_property_search` - Natural language property search
- `create_collaborative_workflow` - Collaborative analysis workflows
- `setup_market_watch` - Real-time market monitoring
- `authenticate_user` - User authentication
- `update_user_profile` - Profile management
- `upload_listing_images` - Image storage
- `get_market_insights` - AI-powered market insights
- `system_health_check` - System status monitoring

## Architecture

- **NEON Database**: Persistent storage with vector search
- **SuperBase**: Authentication and real-time features
- **LLAMA Integration**: AI-powered analysis
- **Fish API**: Web scraping capabilities

## License

MIT
