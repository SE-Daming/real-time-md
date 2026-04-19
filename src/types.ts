// Claude Code JSONL Record Types

export interface BaseRecord {
  type: string;
  uuid?: string;
  parentUuid?: string | null;
  timestamp?: string;
  sessionId?: string;
  isSidechain?: boolean;
}

// User message
export interface UserRecord extends BaseRecord {
  type: 'user';
  message: {
    role: 'user';
    content: string | ContentBlock[];
  };
  promptId?: string;
  permissionMode?: string;
  userType?: string;
  entrypoint?: string;
  cwd?: string;
}

// Assistant message
export interface AssistantRecord extends BaseRecord {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: ContentBlock[];
    id?: string;
    model?: string;
    stop_reason?: string;
    usage?: UsageInfo;
  };
  error?: string;
  isApiErrorMessage?: boolean;
}

// Tool result (embedded in user message content)
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// Tool use (embedded in assistant message content)
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Text content block
export interface TextBlock {
  type: 'text';
  text: string;
}

// Content block union
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

// Usage info
export interface UsageInfo {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// Attachment record
export interface AttachmentRecord extends BaseRecord {
  type: 'attachment';
  attachment: {
    type: string;
    name?: string;
    species?: string;
  };
}

// File history snapshot
export interface FileHistoryRecord extends BaseRecord {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
}

// Permission mode record
export interface PermissionModeRecord extends BaseRecord {
  type: 'permission-mode';
  permissionMode: string;
}

// Queue operation record
export interface QueueOperationRecord extends BaseRecord {
  type: 'queue-operation';
  operation: 'enqueue' | 'dequeue';
}

// All record types
export type JsonlRecord =
  | UserRecord
  | AssistantRecord
  | AttachmentRecord
  | FileHistoryRecord
  | PermissionModeRecord
  | QueueOperationRecord;

// Message node for building tree
export interface MessageNode {
  uuid: string;
  type: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp?: string;
  parentUuid?: string | null;
  children: MessageNode[];
}

// Session info for listing
export interface SessionInfo {
  sessionId: string;
  projectPath: string;
  filePath: string;
  lastModified: Date;
  messageCount: number;
}
