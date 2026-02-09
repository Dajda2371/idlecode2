// Monaco Editor Bridge - Integrates Monaco with existing renderer functionality
const monacoManager = require('./monaco-manager');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

class MonacoEditorBridge {
    constructor() {
        this.autosaveTimeout = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Monaco Editor and set up all integrations
     */
    async init() {
        try {
            const container = document.getElementById('monaco-editor-container');
            if (!container) {
                throw new Error('Monaco editor container not found');
            }

            // Initialize Monaco
            await monacoManager.init(container);

            // Set up event listeners
            this._setupMonacoListeners();
            this._setupIPCListeners();

            this.isInitialized = true;
            console.log('Monaco Editor Bridge initialized');
        } catch (error) {
            console.error('Failed to initialize Monaco Editor Bridge:', error);
            throw error;
        }
    }

    /**
     * Set up Monaco-specific event listeners
     */
    _setupMonacoListeners() {
        // Content change listener for auto-save
        window.addEventListener('monaco-content-changed', (e) => {
            this._debouncedSave();
        });

        // Cursor position change listener for footer
        window.addEventListener('monaco-cursor-changed', (e) => {
            const { line, column } = e.detail;
            const lnDiv = document.getElementById('footer-ln');
            const colDiv = document.getElementById('footer-col');
            if (lnDiv) lnDiv.textContent = `Ln: ${line}`;
            if (colDiv) colDiv.textContent = `Col: ${column}`;
        });
    }

    /**
     * Set up IPC listeners for menu actions
     */
    _setupIPCListeners() {
        // File operations
        ipcRenderer.on('save-file', () => {
            this.saveFile(false);
        });

        ipcRenderer.on('open-file', (event, filePath) => {
            this.openFile(filePath);
        });

        // Edit operations
        ipcRenderer.on('edit-undo', () => {
            monacoManager.undo();
        });

        ipcRenderer.on('edit-redo', () => {
            monacoManager.redo();
        });

        // Format operations
        ipcRenderer.on('format-indent', () => {
            this._indentSelection();
        });

        ipcRenderer.on('format-dedent', () => {
            this._dedentSelection();
        });

        // Find/Replace
        ipcRenderer.on('edit-find', () => {
            monacoManager.find('');
        });

        ipcRenderer.on('edit-replace', () => {
            monacoManager.showReplace();
        });

        // Format Document
        ipcRenderer.on('format-document', async () => {
            await monacoManager.formatDocument();
        });
    }

    /**
     * Open a file in Monaco Editor
     * @param {string} filePath - Path to the file to open
     */
    openFile(filePath) {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }

            // Update document title
            document.title = `${path.basename(filePath)} - ${filePath}`;

            // Open in Monaco
            monacoManager.openFile(filePath, data);
        });
    }

    /**
     * Save the current file
     * @param {boolean} silent - Whether to show save feedback
     * @returns {Promise<boolean>} Success status
     */
    async saveFile(silent = false) {
        const fileInfo = monacoManager.saveCurrentFile();

        if (!fileInfo) {
            if (!silent) {
                ipcRenderer.send('save-as-request');
            }
            return false;
        }

        return new Promise((resolve) => {
            fs.writeFile(fileInfo.path, fileInfo.content, (err) => {
                if (err) {
                    if (!silent) {
                        alert(`Error saving file: ${err.message}`);
                    }
                    console.error('Error saving file:', err);
                    resolve(false);
                    return;
                }

                if (!silent) {
                    // Flash save feedback in title
                    const title = document.title;
                    document.title = title.replace(' *', '') + ' (Saved)';
                    setTimeout(() => {
                        document.title = title.replace(' *', '');
                    }, 2000);
                }
                resolve(true);
            });
        });
    }

    /**
     * Debounced auto-save
     */
    _debouncedSave() {
        if (this.autosaveTimeout) {
            clearTimeout(this.autosaveTimeout);
        }
        this.autosaveTimeout = setTimeout(() => {
            this.saveFile(true);
        }, 1000);
    }

    /**
     * Indent selected lines
     */
    _indentSelection() {
        if (!monacoManager.editor) return;

        const editor = monacoManager.editor;
        const model = editor.getModel();
        if (!model) return;

        const selection = editor.getSelection();
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;

        editor.executeEdits('indent', [{
            range: new monaco.Range(startLine, 1, endLine, 1),
            text: null,
            forceMoveMarkers: true
        }]);

        // Apply indentation to each line
        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            const lineContent = model.getLineContent(lineNumber);
            model.applyEdits([{
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                text: '    '
            }]);
        }
    }

    /**
     * Dedent selected lines
     */
    _dedentSelection() {
        if (!monacoManager.editor) return;

        const editor = monacoManager.editor;
        const model = editor.getModel();
        if (!model) return;

        const selection = editor.getSelection();
        const startLine = selection.startLineNumber;
        const endLine = selection.endLineNumber;

        // Remove up to 4 spaces (or 1 tab) from each line
        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
            const lineContent = model.getLineContent(lineNumber);
            let toRemove = 0;

            if (lineContent.startsWith('    ')) {
                toRemove = 4;
            } else if (lineContent.startsWith('\t')) {
                toRemove = 1;
            } else {
                const match = lineContent.match(/^ +/);
                if (match) {
                    toRemove = Math.min(match[0].length, 4);
                }
            }

            if (toRemove > 0) {
                model.applyEdits([{
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1 + toRemove),
                    text: ''
                }]);
            }
        }
    }

    /**
     * Update editor theme
     * @param {string} theme - Theme name ('vs', 'vs-dark', 'hc-black')
     */
    setTheme(theme) {
        monacoManager.setTheme(theme);
    }

    /**
     * Update editor options
     * @param {Object} options - Editor options
     */
    updateOptions(options) {
        monacoManager.updateOptions(options);
    }
}

// Export as singleton
module.exports = new MonacoEditorBridge();
