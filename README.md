# Real-time JSONL to Markdown Viewer

实时查看 Claude Code 会话记录的轻量级工具。

## 功能特性

- 🔄 **实时监听** - 自动检测 JSONL 文件变化并实时更新
- 📝 **Markdown 渲染** - 友好的 Markdown 格式显示
- 🎨 **代码高亮** - 支持代码块语法高亮
- 📱 **响应式设计** - 支持暗色/亮色主题
- 📋 **会话列表** - 自动列出所有 Claude Code 会话

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后访问 http://localhost:3000

## 使用方法

1. 打开浏览器访问 `http://localhost:3000`
2. 从左侧列表选择会话，或输入自定义 JSONL 文件路径
3. 实时查看会话内容更新

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/sessions` | GET | 获取所有可用会话 |
| `/watch` | POST | 开始监听文件 `{ "filePath": "..." }` |
| `/stop` | GET | 停止监听 |
| `/sse` | GET | SSE 事件流 |
| `/status` | GET | 获取当前状态 |

## 技术栈

- Node.js + TypeScript
- Express.js
- chokidar (文件监听)
- marked.js (Markdown 渲染)
- highlight.js (代码高亮)

## 许可证

MIT
