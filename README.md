# Project Flattener

A web-based tool that helps prepare source code for Large Language Models (LLMs) by combining multiple files into a single text file. Perfect for when you need to share your codebase with AI models like GPT-4, Claude, or Gemini.

## Features

- 🗂️ Drag & drop folder support
- 📏 Token limit awareness for various LLMs
- 🧹 Comment stripping for common programming languages
- ⚙️ Configurable file/folder exclusion patterns
- 📊 Real-time token counting
- 💾 Binary file handling options

## Supported Models

- GPT-4 (128K tokens)
- Claude 2 (100K tokens)
- Gemini Experimental 1206 (2M tokens)
- Gemini 1.5 Pro (1M tokens)

## Usage

1. Open `index.html` in a modern browser (Chrome/Edge recommended)
2. Select your target LLM model
3. Configure options:
   - Strip comments to reduce token usage
   - Include/exclude binary files
   - Adjust file exclusion patterns
4. Drag a folder or use the "Select Directory" button
5. Copy the processed output to clipboard

## Comment Stripping Support

Supports comment removal for:
- JavaScript/TypeScript
- Python
- PHP
- Java
- C/C++
- Ruby
- Go
- Rust
- Shell scripts
- And more...

## Default Exclusions

Comes with sensible defaults for excluding:
- Version control directories (.git, .svn)
- Dependencies (node_modules, vendor)
- Build outputs (dist, build)
- IDE files (.idea, .vscode)
- Compiled files (*.exe, *.pyc)
- And many more...

## Browser Support

- Chrome/Chromium (recommended)
- Edge
- Other modern browsers with File System Access API support

## Local Development

1. Clone the repository
2. Open `index.html` in your browser
3. No build process or dependencies required

## License

MIT License - See LICENSE file for details 