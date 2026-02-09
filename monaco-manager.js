// Monaco Editor Integration for Electron - Local Node Version
const path = require('path');
const fs = require('fs');

class MonacoEditorManager {
    constructor() {
        this.editor = null;
        this.currentFilePath = null;
        this.currentModel = null;
        this.models = new Map(); // Cache models for open files
        this.isInitialized = false;
    }

    /**
     * Initialize Monaco Editor using local node_modules
     * @param {HTMLElement} container - The container element for the editor
     */
    async init(container) {
        if (this.isInitialized) {
            console.warn('Monaco Editor already initialized');
            return;
        }

        try {
            console.log('Initializing Monaco Editor from local node_modules...');

            // Resolving paths
            // We assume 'monaco-editor' is installed and resolvable
            const monacoPkgPath = require.resolve('monaco-editor/package.json');
            const monacoPath = path.dirname(monacoPkgPath);
            const vsDir = path.join(monacoPath, 'min/vs');
            const loaderPath = path.join(vsDir, 'loader.js');

            if (!fs.existsSync(loaderPath)) {
                throw new Error(`Monaco loader not found at ${loaderPath}`);
            }

            // Load CSS manually
            const cssPath = path.join(vsDir, 'editor/editor.main.css');
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `file://${cssPath}`;
            document.head.appendChild(cssLink);

            // Load AMD Loader via Node require
            // This exposes 'require' and 'define' from the loader
            const amdLoader = require(loaderPath);
            const amdRequire = amdLoader.require;

            // Helper to convert path to URI for AMD config
            function uriFromPath(_path) {
                let pathName = path.resolve(_path).replace(/\\/g, '/');
                if (pathName.length > 0 && pathName.charAt(0) !== '/') {
                    pathName = '/' + pathName;
                }
                return encodeURI('file://' + pathName);
            }

            // Config AMD Loader
            amdRequire.config({
                baseUrl: uriFromPath(path.join(monacoPath, 'min'))
            });

            // Electron/Node integration workaround
            // Monaco's loader might get confused by 'module' global
            self.module = undefined;

            // Worker Configuration
            // For 0.55+ in Electron, we let Monaco use its default worker loading strategy.
            // If that fails (e.g. 404s), we might need more complex blob handling,
            // but usually valid baseUrl is enough for standard workers.
            window.MonacoEnvironment = {
                getWorkerUrl: function (moduleId, label) {
                    return null; // Use default behavior
                }
            };

            // Load Editor Module
            await new Promise((resolve, reject) => {
                amdRequire(['vs/editor/editor.main'], () => {
                    resolve();
                }, (err) => {
                    reject(err);
                });
            });

            console.log('Monaco modules loaded.');

            // Create Editor
            this._createEditor(container);

            // Setup Listeners
            this._setupEventListeners();

            this.isInitialized = true;
            console.log('Monaco Manager initialized.');

        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error);
            throw error;
        }
    }

    _createEditor(container) {
        if (this.editor) return;

        this.editor = monaco.editor.create(container, {
            value: '# Welcome to Monaco Editor!\n# Open a file from the file tree to start editing.',
            language: 'python',
            theme: 'vs', // Standard light theme
            fontSize: 13,
            fontFamily: "'Courier New', Courier, monospace",
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            minimap: { enabled: true },
            scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10
            },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            wordBasedSuggestions: 'matchingDocuments',
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
            cursorStyle: 'line',
            cursorBlinking: 'blink'
        });
    }

    /**
     * Set up editor event listeners
     */
    _setupEventListeners() {
        if (!this.editor) return;

        // Content change listener for auto-save
        this.editor.onDidChangeModelContent((e) => {
            // Emit custom event for auto-save
            window.dispatchEvent(new CustomEvent('monaco-content-changed', {
                detail: {
                    filePath: this.currentFilePath,
                    value: this.editor.getValue()
                }
            }));
        });

        // Cursor position change listener
        this.editor.onDidChangeCursorPosition((e) => {
            const position = e.position;
            window.dispatchEvent(new CustomEvent('monaco-cursor-changed', {
                detail: {
                    line: position.lineNumber,
                    column: position.column
                }
            }));
        });

        // Focus listener
        this.editor.onDidFocusEditorText(() => {
            window.dispatchEvent(new Event('monaco-focus'));
        });

        // Blur listener
        this.editor.onDidBlurEditorText(() => {
            window.dispatchEvent(new Event('monaco-blur'));
        });
    }

    /**
     * Open a file in the editor
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     */
    openFile(filePath, content) {
        if (!this.editor) {
            console.error('Editor not initialized');
            return;
        }

        const monaco = window.monaco;

        // Determine language from file extension
        const language = this._getLanguageFromPath(filePath);

        // Check if we already have a model for this file
        let model = this.models.get(filePath);

        if (!model) {
            // Create a new model
            const uri = monaco.Uri.file(filePath);

            // Check if model already exists in Monaco core (loaded via other means)
            const existing = monaco.editor.getModel(uri);
            if (existing) {
                model = existing;
                model.setValue(content);
            } else {
                model = monaco.editor.createModel(content, language, uri);
            }
            this.models.set(filePath, model);
        } else {
            // Update existing model if content changed
            if (model.getValue() !== content) {
                model.setValue(content);
            }
        }

        // Set the model to the editor
        this.editor.setModel(model);
        this.currentFilePath = filePath;
        this.currentModel = model;

        // Make editor editable
        this.editor.updateOptions({ readOnly: false });

        // Focus the editor
        this.editor.focus();
    }

    /**
     * Get the current editor content
     * @returns {string} Current content
     */
    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    /**
     * Set editor content
     * @param {string} value - Content to set
     */
    setValue(value) {
        if (this.editor) {
            this.editor.setValue(value);
        }
    }

    /**
     * Get current file path
     */
    getCurrentFilePath() {
        return this.currentFilePath;
    }

    /**
     * Save current file
     * @returns {Object} File info with path and content
     */
    saveCurrentFile() {
        if (!this.currentFilePath || !this.editor) {
            return null;
        }

        return {
            path: this.currentFilePath,
            content: this.editor.getValue()
        };
    }

    /**
     * Determine language from file path
     * @param {string} filePath - File path
     * @returns {string} Monaco language identifier
     */
    _getLanguageFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.json': 'json',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less',
            '.md': 'markdown',
            '.txt': 'plaintext',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.sh': 'shell',
            '.bash': 'shell',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.sql': 'sql',
            '.php': 'php',
            '.rb': 'ruby'
        };

        return languageMap[ext] || 'plaintext';
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'undo', null);
        }
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'redo', null);
        }
    }

    /**
     * Format document
     */
    async formatDocument() {
        if (this.editor) {
            await this.editor.getAction('editor.action.formatDocument').run();
        }
    }

    /**
     * Find text
     * @param {string} text - Text to find
     */
    find(text) {
        if (this.editor) {
            this.editor.trigger('keyboard', 'actions.find', { searchString: text });
        }
    }

    /**
     * Replace text
     */
    showReplace() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
        }
    }

    /**
     * Set editor theme
     * @param {string} theme - Theme name ('vs', 'vs-dark', 'hc-black')
     */
    setTheme(theme) {
        if (window.monaco) {
            window.monaco.editor.setTheme(theme);
        }
    }

    /**
     * Update editor options
     * @param {Object} options - Monaco editor options
     */
    updateOptions(options) {
        if (this.editor) {
            this.editor.updateOptions(options);
        }
    }

    /**
     * Dispose of a model for a closed file
     * @param {string} filePath - Path to the file
     */
    closeFile(filePath) {
        const model = this.models.get(filePath);
        if (model) {
            model.dispose();
            this.models.delete(filePath);
        }
    }

    /**
     * Dispose the editor
     */
    dispose() {
        // Dispose all models
        this.models.forEach(model => model.dispose());
        this.models.clear();

        // Dispose the editor
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }

        this.isInitialized = false;
    }

    /**
     * Get cursor position
     * @returns {Object} Position with line and column
     */
    getCursorPosition() {
        if (!this.editor) return { line: 1, column: 1 };
        const position = this.editor.getPosition();
        return {
            line: position.lineNumber,
            column: position.column
        };
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }
}

// Export as singleton
module.exports = new MonacoEditorManager();
