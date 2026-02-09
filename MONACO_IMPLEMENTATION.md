# Monaco Editor Implementation

## Overview
Successfully integrated Monaco Editor (the code editor that powers VS Code) into the Electron application, replacing the previous custom contenteditable-based editor.

## New Files Created

### 1. `monaco-manager.js`
Core Monaco Editor management class that handles:
- **Editor initialization** with proper AMD loader configuration for Electron
- **File operations** (open, save, close)
- **Language detection** from file extensions (Python, JavaScript, TypeScript, HTML, CSS, etc.)
- **Model management** (caching models for open files)
- **Event system** for content changes and cursor position updates
- **Editor operations** (undo, redo, find, replace, format)
- **Theme management** (light/dark themes)
- **Configuration updates** (font size, font family, etc.)

Key Features:
- Automatic language detection based on file extension
- Model caching to preserve edit history when switching between files
- VS Code-like editing experience with IntelliSense, syntax highlighting, and more
- Built-in undo/redo stack
- Minimap support
- Auto-layout handling

### 2. `monaco-bridge.js`
Bridge layer connecting Monaco Editor with the existing Electron IPC system:
- **IPC integration** for menu actions (save, undo, redo, find, replace, format)
- **Auto-save functionality** with 1-second debounce
- **File I/O operations** working with existing file tree
- **Cursor position updates** for the footer status bar
- **Indent/dedent operations** for selected text
- **Theme switching** support

## Modified Files

### `package.json`
- Added `monaco-editor: ^0.55.1` as a dependency

### `index.html`
- Replaced the custom contenteditable editor structure with a simple Monaco container:
  ```html
  <div class="flex-1" id="monaco-editor-container"></div>
  ```
- Removed old line numbers and code content divs

### `renderer.js`
- Added Monaco Bridge initialization on DOM ready
- Updated `openFile()` function to use Monaco Bridge
- Preserved existing file tree, context menu, and console functionality
- Old editor functions (renderCode, getSelectionOffsets, etc.) are now superseded by Monaco

## Features

### Monaco Editor Features Now Available:
1. **Advanced Syntax Highlighting** - Full language support with proper tokenization
2. **IntelliSense** - Code completion and suggestions
3. **Multi-cursor Editing** - Hold Alt/Option and click to create multiple cursors
4. **Find and Replace** - Built-in find/replace with regex support (Ctrl/Cmd+F)
5. **Code Folding** - Collapse/expand code blocks
6. **Minimap** - Bird's eye view of the code
7. **Bracket Matching** - Automatic bracket pair highlighting
8. **Auto-indentation** - Smart indentation based on language
9. **Line Numbers** - Built-in line number gutter
10. **Column Selection** - Alt+Shift+drag for column selection
11. **Format Document** - Automatic code formatting
12. **Undo/Redo** - Robust undo/redo stack
13. **Smooth Scrolling** - Better scroll performance
14. **Automatic Layout** - Resizes automatically with container

### Supported Languages:
- Python (`.py`)
- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- JSON (`.json`)
- HTML (`.html`)
- CSS (`.css`, `.scss`, `.less`)
- Markdown (`.md`)
- Shell (`.sh`, `.bash`)
- And many more...

## Configuration

The editor is initialized with the following default settings:
```javascript
{
    language: 'python',       // Default to Python
    theme: 'vs',              // Light theme (vs-dark for dark)
    fontSize: 13,
    fontFamily: "'Courier New', Courier, monospace",
    lineNumbers: 'on',
    minimap: { enabled: true },
    tabSize: 4,
    insertSpaces: true,
    automaticLayout: true
}
```

## Upgrading from Old Editor

### What Changed:
1. **No more contenteditable** - Monaco uses a proper canvas-based renderer
2. **Better performance** - Faster highlighting and editing for large files
3. **More features** - Built-in find/replace, IntelliSense, etc.
4. **Better accessibility** - Screen reader support

### What Stayed the Same:
- File tree operations
- IPC menu integration
- Auto-save functionality
- Keyboard shortcuts (Ctrl/Cmd+S for save, etc.)
- Console and shell sessions
- Project structure

## Usage

### Opening Files:
Files are automatically opened in Monaco when clicked in the file tree. The editor will:
1. Detect the language from the file extension
2. Create or retrieve a cached model for the file
3. Apply syntax highlighting
4. Enable editing

### Saving Files:
- **Manual Save**: Ctrl/Cmd+S or File → Save
- **Auto-save**: Automatically saves 1 second after you stop typing

### Keyboard Shortcuts:
- `Ctrl/Cmd+S` - Save file
- `Ctrl/Cmd+F` - Find
- `Ctrl/Cmd+H` - Replace
- `Ctrl/Cmd+Z` - Undo
- `Ctrl/Cmd+Shift+Z` - Redo
- `Tab` - Indent
- `Shift+Tab` - Dedent
- `Alt+Up/Down` - Move line up/down
- `Alt+Click` - Add cursor
- `Ctrl/Cmd+D` - Add selection to next match

## Future Enhancements

Possible improvements for later:
1. **Theme customization** - Custom color schemes matching IDLE colors
2. **Extension support** - Add plugins for additional languages
3. **Diff editor** - Side-by-side file comparison
4. **Git integration** - Show git changes in gutter
5. **Multi-file editing** - Tab support for multiple open files
6. **Settings UI** - Configure Monaco options through the settings modal

## Troubleshooting

### If Monaco doesn't load:
1. Check the console for errors
2. Ensure `node_modules/monaco-editor` exists
3. Run `npm install` again
4. Restart the Electron app

### If syntax highlighting doesn't work:
- Check the file extension is recognized
- Monaco may need the worker configuration updated

### If save doesn't work:
- Check file permissions
- Ensure the file path is valid
- Check the console for error messages

## Technical Details

### Architecture:
```
renderer.js
    ↓
monaco-bridge.js (IPC & Integration Layer)
    ↓
monaco-manager.js (Monaco Core Management)
    ↓
Monaco Editor Library
```

### Event Flow:
1. User clicks file in tree → `openFile()` called
2. `monaco-bridge.openFile()` reads file
3. `monaco-manager.openFile()` creates/retrieves model
4. `monaco.editor.setModel()` displays content
5. User edits → content change event
6. Auto-save triggered after 1 second
7. File saved to disk

## Notes

- Monaco Editor is a large library (~5MB), but provides professional-grade editing
- The editor uses workers for language services, improving performance
- Models are cached to maintain undo/redo history when switching files
- The old contenteditable code in `renderer.js` can be removed in a future cleanup
