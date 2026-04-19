import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  JsonlRecord,
  UserRecord,
  AssistantRecord,
  MessageNode,
  SessionInfo,
} from './types';

export class JsonlParser {
  private nodes: Map<string, MessageNode> = new Map();
  private rootNodes: MessageNode[] = [];
  private lastPosition: number = 0;
  private filePath: string = '';

  /**
   * Parse a JSONL file and build message tree
   */
  parseFile(filePath: string): MessageNode[] {
    this.filePath = filePath;
    this.nodes.clear();
    this.rootNodes = [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as JsonlRecord;
        this.processRecord(record);
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    this.buildTree();
    return this.rootNodes;
  }

  /**
   * Incrementally read new content from last position
   */
  readIncremental(): MessageNode[] {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return [];
    }

    const stat = fs.statSync(this.filePath);
    if (stat.size <= this.lastPosition) {
      return [];
    }

    const fd = fs.openSync(this.filePath, 'r');
    const buffer = Buffer.alloc(stat.size - this.lastPosition);
    fs.readSync(fd, buffer, 0, buffer.length, this.lastPosition);
    fs.closeSync(fd);

    this.lastPosition = stat.size;

    const newContent = buffer.toString('utf-8');
    const lines = newContent.split('\n').filter(line => line.trim());

    const newNodes: MessageNode[] = [];

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as JsonlRecord;
        const node = this.processRecord(record);
        if (node) {
          this.linkNode(node);
          newNodes.push(node);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }

    return newNodes;
  }

  /**
   * Reset parser state for new file
   */
  reset(filePath?: string): void {
    if (filePath) {
      this.filePath = filePath;
    }
    this.nodes.clear();
    this.rootNodes = [];
    this.lastPosition = 0;
  }

  /**
   * Get current file position
   */
  getLastPosition(): number {
    return this.lastPosition;
  }

  /**
   * Set file position (useful when starting fresh)
   */
  setLastPosition(pos: number): void {
    this.lastPosition = pos;
  }

  /**
   * Process a single JSONL record
   */
  private processRecord(record: JsonlRecord): MessageNode | null {
    // Only process user and assistant messages
    if (record.type === 'user') {
      return this.processUserRecord(record as UserRecord);
    } else if (record.type === 'assistant') {
      return this.processAssistantRecord(record as AssistantRecord);
    }
    return null;
  }

  private processUserRecord(record: UserRecord): MessageNode | null {
    if (!record.uuid) return null;

    const node: MessageNode = {
      uuid: record.uuid,
      type: 'user',
      content: record.message.content,
      timestamp: record.timestamp,
      parentUuid: record.parentUuid,
      children: [],
    };

    this.nodes.set(record.uuid, node);
    return node;
  }

  private processAssistantRecord(record: AssistantRecord): MessageNode | null {
    if (!record.uuid) return null;

    const node: MessageNode = {
      uuid: record.uuid,
      type: 'assistant',
      content: record.message.content,
      timestamp: record.timestamp,
      parentUuid: record.parentUuid,
      children: [],
    };

    this.nodes.set(record.uuid, node);
    return node;
  }

  /**
   * Build message tree from all nodes
   */
  private buildTree(): void {
    for (const node of this.nodes.values()) {
      this.linkNode(node);
    }
  }

  /**
   * Link a node to its parent
   */
  private linkNode(node: MessageNode): void {
    if (!node.parentUuid) {
      // Root node
      if (!this.rootNodes.includes(node)) {
        this.rootNodes.push(node);
      }
    } else {
      const parent = this.nodes.get(node.parentUuid);
      if (parent) {
        if (!parent.children.includes(node)) {
          parent.children.push(node);
        }
      } else {
        // Parent not found, treat as root
        if (!this.rootNodes.includes(node)) {
          this.rootNodes.push(node);
        }
      }
    }
  }
}

/**
 * List available Claude Code sessions
 */
export function listSessions(): SessionInfo[] {
  const claudeDir = path.join(os.homedir(), '.claude');
  const projectsDir = path.join(claudeDir, 'projects');

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const sessions: SessionInfo[] = [];
  const projectDirs = fs.readdirSync(projectsDir);

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsDir, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const files = fs.readdirSync(projectPath);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;

      const filePath = path.join(projectPath, file);
      const stat = fs.statSync(filePath);

      // Count lines (messages)
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const messageCount = lines.filter(l => {
        try {
          const record = JSON.parse(l);
          return record.type === 'user' || record.type === 'assistant';
        } catch {
          return false;
        }
      }).length;

      sessions.push({
        sessionId: file.replace('.jsonl', ''),
        projectPath: projectDir.replace(/^-/, '/').replace(/-/g, '/'),
        filePath,
        lastModified: stat.mtime,
        messageCount,
      });
    }
  }

  // Sort by last modified, newest first
  return sessions.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

/**
 * Expand home path (~)
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
