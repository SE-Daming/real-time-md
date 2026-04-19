import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { JsonlParser, listSessions, expandPath } from './parser';
import { renderToMarkdown, renderNode } from './renderer';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// SSE clients
const clients: Set<express.Response> = new Set();

// Current watched file
let currentFile: string | null = null;
let fileWatcher: chokidar.FSWatcher | null = null;
const parser = new JsonlParser();

/**
 * SSE endpoint for real-time updates
 */
app.get('/sse', (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    clients.delete(res);
  });
});

/**
 * Broadcast to all SSE clients
 */
function broadcast(data: object): void {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

/**
 * Start watching a file
 */
app.post('/watch', (req: express.Request, res: express.Response) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }

  const expandedPath = expandPath(filePath);

  if (!fs.existsSync(expandedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Stop previous watcher
  if (fileWatcher) {
    fileWatcher.close();
  }

  // Parse initial content
  currentFile = expandedPath;
  parser.reset(expandedPath);
  const nodes = parser.parseFile(expandedPath);
  const markdown = renderToMarkdown(nodes);
  const stat = fs.statSync(expandedPath);
  parser.setLastPosition(stat.size);

  // Start watching
  fileWatcher = chokidar.watch(expandedPath, {
    persistent: true,
    usePolling: true,
    interval: 500,
  });

  fileWatcher.on('change', (changedPath: string) => {
    console.log(`File changed: ${changedPath}`);
    const newNodes = parser.readIncremental();

    if (newNodes.length > 0) {
      const newMarkdown = newNodes.map(n => renderNode(n)).join('\n\n---\n\n');
      broadcast({
        type: 'update',
        content: newMarkdown,
        count: newNodes.length,
      });
    }
  });

  res.json({
    success: true,
    filePath: expandedPath,
    messageCount: nodes.length,
    markdown,
  });
});

/**
 * Stop watching
 */
app.get('/stop', (req: express.Request, res: express.Response) => {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  currentFile = null;
  parser.reset();
  res.json({ success: true });
});

/**
 * Get available sessions
 */
app.get('/sessions', (req: express.Request, res: express.Response) => {
  const sessions = listSessions();
  res.json(sessions);
});

/**
 * Get current watched file info
 */
app.get('/status', (req: express.Request, res: express.Response) => {
  res.json({
    watching: currentFile !== null,
    filePath: currentFile,
    clientCount: clients.size,
  });
});

/**
 * Serve main page
 */
app.get('/', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║       Real-time JSONL to Markdown Viewer                 ║
╠══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                ║
║                                                          ║
║  Usage:                                                  ║
║  1. Open http://localhost:${PORT} in your browser          ║
║  2. Select a session or enter a JSONL file path          ║
║  3. Watch real-time updates as Claude Code runs          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (fileWatcher) {
    fileWatcher.close();
  }
  for (const client of clients) {
    client.end();
  }
  process.exit(0);
});
