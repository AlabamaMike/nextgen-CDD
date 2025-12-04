# Thesis Validator TUI Client

Terminal User Interface client for the Thesis Validator application.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Usage

```bash
npm start                          # Connect to localhost:3000
npm start -- --server=api.prod.com # Connect to remote server
```

## Architecture

Standalone client that connects to Thesis Validator API via:
- REST endpoints (axios)
- WebSocket connections (ws)

Built with ink (React for CLIs) for component-based UI.
