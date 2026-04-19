import { marked } from 'marked';
import { MessageNode, ContentBlock, TextBlock, ToolUseBlock, ToolResultBlock } from './types';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Render message nodes to Markdown
 */
export function renderToMarkdown(nodes: MessageNode[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    parts.push(renderNode(node));
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Render a single message node
 */
export function renderNode(node: MessageNode, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const parts: string[] = [];

  // Header based on type
  const icon = node.type === 'user' ? '👤' : '🤖';
  const role = node.type === 'user' ? 'User' : 'Assistant';
  const timestamp = node.timestamp ? formatTimestamp(node.timestamp) : '';

  parts.push(`${indent}## ${icon} ${role}${timestamp ? ` <small>${timestamp}</small>` : ''}`);

  // Content
  const content = renderContent(node.content, indent);
  parts.push(content);

  // Children (for nested context)
  if (node.children.length > 0) {
    for (const child of node.children) {
      parts.push(renderNode(child, depth + 1));
    }
  }

  return parts.join('\n\n');
}

/**
 * Render content (string or array of blocks)
 */
function renderContent(content: string | ContentBlock[], indent: string): string {
  if (typeof content === 'string') {
    return indent + content;
  }

  const parts: string[] = [];

  for (const block of content) {
    parts.push(renderBlock(block, indent));
  }

  return parts.join('\n\n');
}

/**
 * Render a single content block
 */
function renderBlock(block: ContentBlock, indent: string): string {
  switch (block.type) {
    case 'text':
      return renderTextBlock(block, indent);
    case 'tool_use':
      return renderToolUseBlock(block, indent);
    case 'tool_result':
      return renderToolResultBlock(block, indent);
    default:
      return indent + '*(unknown content type)*';
  }
}

/**
 * Render text block
 */
function renderTextBlock(block: TextBlock, indent: string): string {
  return indent + block.text;
}

/**
 * Render tool use block (collapsible)
 */
function renderToolUseBlock(block: ToolUseBlock, indent: string): string {
  const toolName = block.name;
  const input = block.input;

  let inputStr: string;
  try {
    inputStr = JSON.stringify(input, null, 2);
  } catch {
    inputStr = String(input);
  }

  // Truncate long inputs
  if (inputStr.length > 2000) {
    inputStr = inputStr.slice(0, 2000) + '\n... (truncated)';
  }

  return `${indent}<details>
${indent}<summary><strong>🔧 ${toolName}</strong></summary>

${indent}\`\`\`json
${indent}${inputStr.split('\n').join('\n' + indent)}
${indent}\`\`\`
${indent}</details>`;
}

/**
 * Render tool result block (collapsible)
 */
function renderToolResultBlock(block: ToolResultBlock, indent: string): string {
  const isError = block.is_error;
  const icon = isError ? '❌' : '✅';
  const title = isError ? 'Error' : 'Result';

  let content = block.content;

  // Truncate long results
  if (content.length > 5000) {
    content = content.slice(0, 5000) + '\n... (truncated)';
  }

  // Detect if content is code-like
  const isCode = content.includes('\n') && (content.includes('{') || content.includes('function'));

  if (isCode) {
    return `${indent}<details>
${indent}<summary><strong>${icon} ${title}</strong></summary>

${indent}\`\`\`
${indent}${content.split('\n').join('\n' + indent)}
${indent}\`\`\`
${indent}</details>`;
  }

  return `${indent}<details>
${indent}<summary><strong>${icon} ${title}</strong></summary>

${indent}${content.split('\n').join('\n' + indent)}
${indent}</details>`;
}

/**
 * Format ISO timestamp to readable format
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Render full HTML page with embedded CSS
 */
export function renderFullHtml(markdown: string, title: string = 'Claude Code Session'): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <button id="theme-toggle" title="Toggle theme">🌙</button>
    </div>
    <div id="content" class="markdown-body">
      ${marked.parse(markdown) as string}
    </div>
  </div>
  <script src="/client.js"></script>
</body>
</html>`;
}
