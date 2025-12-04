#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './App.js';

const program = new Command();

program
  .name('thesis-tui')
  .description('Terminal UI for Thesis Validator')
  .version('1.0.0')
  .option('-s, --server <url>', 'API server URL', 'http://localhost:3000')
  .parse();

const options = program.opts<{ server: string }>();

render(<App serverUrl={options.server} />);
