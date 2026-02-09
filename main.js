const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true
        }
    })

    win.loadFile('index.html')

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        win.webContents.send('new-file');
                    }
                },
                {
                    label: 'Open File...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog(win, {
                            properties: ['openFile']
                        })
                        if (!canceled && filePaths.length > 0) {
                            win.webContents.send('open-file', filePaths[0])
                        }
                    }
                },
                { label: 'Recent Files', submenu: [{ label: 'No Recent Files', enabled: false }] },
                { type: 'separator' },
                {
                    label: 'Open Folder...',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog(win, {
                            properties: ['openDirectory']
                        })
                        if (!canceled && filePaths.length > 0) {
                            win.webContents.send('open-folder', filePaths[0])
                        }
                    }
                },
                { label: 'Recent Folders', submenu: [{ label: 'No Recent Folders', enabled: false }] },
                { type: 'separator' },
                {
                    label: 'Open Module...',
                    accelerator: 'Alt+M',
                    click: () => win.webContents.send('menu-open-module')
                },
                {
                    label: 'Module Browser',
                    accelerator: 'Alt+C',
                    click: () => win.webContents.send('menu-module-browser')
                },
                {
                    label: 'Path Browser',
                    click: () => win.webContents.send('menu-path-browser')
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => win.webContents.send('save-file')
                },
                { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => win.webContents.send('save-as-request') },
                { label: 'Save Copy As...', accelerator: 'Alt+Shift+S', click: () => win.webContents.send('save-copy-as-request') },
                { type: 'separator' },
                { label: 'Auto-Save', type: 'checkbox', checked: false },
                { type: 'separator' },
                { label: 'Print Window', accelerator: 'CmdOrCtrl+P', click: () => win.webContents.print() },
                { type: 'separator' },
                { label: 'Close Window', accelerator: 'Alt+F4', role: 'close' },
                { label: 'Exit IDLE', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => win.webContents.send('edit-undo') },
                { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => win.webContents.send('edit-redo') },
                { type: 'separator' },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { type: 'separator' },
                {
                    label: 'Find...',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => win.webContents.send('menu-find')
                },
                { label: 'Find Again', accelerator: 'CmdOrCtrl+G', click: () => win.webContents.send('menu-find-next') },
                { label: 'Find Selection', accelerator: 'CmdOrCtrl+F3', click: () => win.webContents.send('menu-find-selection') },
                { label: 'Find in Files...', accelerator: 'Alt+F3', click: () => win.webContents.send('menu-find-in-files') },
                {
                    label: 'Replace...',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => win.webContents.send('menu-replace')
                },
                { type: 'separator' },
                {
                    label: 'Go to Line',
                    accelerator: 'Alt+G',
                    click: () => win.webContents.send('edit-goto-line')
                },
                { label: 'Show Completions', accelerator: 'Control+Space', click: () => win.webContents.send('menu-show-completions') },
                { label: 'Expand Word', accelerator: 'Alt+/' },
                { label: 'Show Call Tip', accelerator: 'CmdOrCtrl+\\', click: () => win.webContents.send('menu-show-call-tip') },
                { label: 'Show Surrounding Parens', accelerator: 'CmdOrCtrl+0' }
            ]
        },
        {
            label: 'Format',
            submenu: [
                {
                    label: 'Indent Region',
                    accelerator: 'CmdOrCtrl+]',
                    click: () => win.webContents.send('format-indent')
                },
                {
                    label: 'Dedent Region',
                    accelerator: 'CmdOrCtrl+[',
                    click: () => win.webContents.send('format-dedent')
                },
                {
                    label: 'Comment Out Region',
                    accelerator: 'Alt+3',
                    click: () => win.webContents.send('format-comment')
                },
                {
                    label: 'Uncomment Region',
                    accelerator: 'Alt+4',
                    click: () => win.webContents.send('format-uncomment')
                },
                {
                    label: 'Tabify Region',
                    accelerator: 'Alt+5',
                    click: () => win.webContents.send('format-tabify')
                },
                {
                    label: 'Untabify Region',
                    accelerator: 'Alt+6',
                    click: () => win.webContents.send('format-untabify')
                },
                { label: 'Toggle Tabs', accelerator: 'Alt+T' },
                { label: 'New Indent Width', accelerator: 'Alt+U' },
                {
                    label: 'Strip Trailing Whitespace',
                    click: () => win.webContents.send('format-strip-trailing')
                }
            ]
        },
        {
            label: 'Run',
            submenu: [
                {
                    label: 'Run Module',
                    accelerator: 'F5',
                    click: () => win.webContents.send('run-module')
                },
                { label: 'Run... Customized', accelerator: 'Shift+F5' },
                {
                    label: 'Check Module',
                    accelerator: 'Alt+X',
                    click: () => win.webContents.send('menu-check-module')
                },
                {
                    label: 'Python Shell',
                    click: () => win.webContents.send('menu-python-shell')
                },
                {
                    label: 'New Shell Window',
                    click: () => win.webContents.send('menu-new-console')
                }
            ]
        },
        {
            label: 'Options',
            submenu: [
                {
                    label: 'Configure IDLE',
                    click: () => win.webContents.send('menu-configure-idle')
                },
                { type: 'separator' },
                { label: 'Show Code Context' },
                {
                    label: 'Show Line Numbers',
                    type: 'checkbox',
                    checked: true,
                    click: () => win.webContents.send('option-show-line-numbers')
                },
                {
                    label: 'Zoom Height',
                    accelerator: 'Alt+2',
                    click: () => {
                        const bounds = win.getBounds();
                        const { screen } = require('electron');
                        const display = screen.getDisplayMatching(bounds);
                        win.setBounds({
                            x: bounds.x,
                            y: display.workArea.y,
                            width: bounds.width,
                            height: display.workArea.height
                        });
                    }
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { label: '*IDLE Shell 3.13.12*' },
                { type: 'separator' },
                {
                    label: 'Explorer',
                    type: 'checkbox',
                    checked: true,
                    id: 'menu-view-explorer',
                    click: (menuItem) => win.webContents.send('toggle-explorer', menuItem.checked)
                },
                {
                    label: 'Console',
                    type: 'checkbox',
                    checked: true,
                    id: 'menu-view-console', // Added ID
                    click: (menuItem) => win.webContents.send('toggle-console', menuItem.checked)
                },
                {
                    label: 'AI Agent',
                    type: 'checkbox',
                    checked: true,
                    id: 'menu-view-agent',
                    click: (menuItem) => win.webContents.send('toggle-ai-agent', menuItem.checked)
                },
                { type: 'separator' },
                {
                    label: 'Toggle Sidebars',
                    accelerator: 'CmdOrCtrl+*', // On Windows, this usually maps to both standard shift+8 and Numpad *
                    click: () => win.webContents.send('toggle-sidebars')
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About IDLE',
                    click: () => {
                        dialog.showMessageBox(win, {
                            title: 'About IdleCode',
                            message: 'IdleCode (Electron IDLE Clone)\n\nBased on Python IDLE interface.',
                            buttons: ['OK']
                        })
                    }
                },
                { type: 'separator' },
                {
                    label: 'IDLE Doc',
                    click: async () => {
                        await shell.openExternal('https://docs.python.org/3/library/idle.html')
                    }
                },
                {
                    label: 'Python Docs',
                    accelerator: 'F1',
                    click: async () => {
                        await shell.openExternal('https://docs.python.org/3/')
                    }
                },
                {
                    label: 'Turtle Demo',
                    click: () => {
                        const turtleWin = new BrowserWindow({
                            width: 800,
                            height: 600,
                            title: 'Turtle Demo',
                            webPreferences: {
                                nodeIntegration: true,
                                contextIsolation: false
                            }
                        });
                        turtleWin.loadFile('turtle-demo.html');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Report IdleCode issue',
                    click: async () => {
                        await shell.openExternal('https://github.com/Dajda2371/idlecode2/issues')
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}



ipcMain.on('save-file', () => {
    // handled in renderer or we can add logic here if needed
});

app.whenReady().then(() => {
    createWindow()

    // Debugging helper
    ipcMain.on('log', (event, msg) => {
        console.log('[RENDERER]', msg);
    });

    app.on('activate', () => {
        const wins = BrowserWindow.getAllWindows();
        if (wins.length === 0) {
            createWindow()
        } else {
            // If window execution context exists but window is hidden/minimized
            wins[0].show();
        }
    })
})

// IPC for Window Visibility
ipcMain.on('hide-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.hide();
});

ipcMain.on('show-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// --- Custom Console Logic ---
// const { ipcMain } = require('electron'); // Removed duplicate

// Pop out console / Run Module separately

let poppedConsoles = [];

// run-module-popout removed, replaced by pop-out-session logic in renderer.js

ipcMain.on('new-console-window', () => {
    const subWin = new BrowserWindow({
        width: 600,
        height: 400,
        title: 'IDLE Shell',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    subWin.loadFile('console.html');
    poppedConsoles.push(subWin);

    subWin.webContents.once('did-finish-load', () => {
        subWin.webContents.send('run-file', null);
    });

    subWin.on('closed', () => {
        const idx = poppedConsoles.indexOf(subWin);
        if (idx > -1) poppedConsoles.splice(idx, 1);
    });
});

// --- Session Management ---
const sessions = new Map();

// Helper: Broadcast to all windows listening to a session
function broadcastToSession(sessionId, channel, ...args) {
    const session = sessions.get(sessionId);
    if (!session) return;

    session.listeners.forEach(wc => {
        if (!wc.isDestroyed()) {
            wc.send(channel, sessionId, ...args);
        }
    });
}

ipcMain.on('session-create', (event, sessionId, filePath, name, force) => {
    let session = sessions.get(sessionId);
    let isRestart = false;

    if (session) {
        if (session.process && !session.process.killed) {
            if (force) {
                try { session.process.kill(); } catch (e) { console.error(e); }
            } else {
                console.log(`Session ${sessionId} already active, skipping create.`);
                return;
            }
        }
        // Restarting: Reset existing session state but preserve listeners
        console.log(`Session ${sessionId} exists but process is dead. Restarting...`);
        session.history = [];
        session.commandHistory = [];
        session.inputDraft = '';
        session.stderrBuffer = '';
        session.stdoutBuffer = '';
        session.waitingForInput = false;
        session.lastPrompt = '>>>';
        session.lastPromptType = 'standard';
        if (name) session.name = name;
        isRestart = true;
    } else {
        session = {
            id: sessionId,
            name: name || (filePath ? `Run: ${path.basename(filePath)}` : `Shell ${sessionId}`),
            history: [],
            commandHistory: [],
            inputDraft: '',
            stderrBuffer: '',
            stdoutBuffer: '',
            waitingForInput: false,
            lastPrompt: '>>>',
            lastPromptType: 'standard',
            listeners: new Set()
        };
        sessions.set(sessionId, session);
    }

    // Standard IDLE behavior: Run file and then stay interactive
    // We use -i to ensure it remains interactive after running the script
    const args = ['-u', '-i'];
    if (filePath) {
        args.push(filePath);
        // Add a restart notification to history so all listeners see it
        const restartEntry = { type: 'meta', text: `\n=== RESTART: ${filePath} ===\n` };
        session.history.push(restartEntry);
    }

    // Spawn Python Process
    let pythonPath = 'python3';
    if (process.platform === 'win32') pythonPath = 'python';

    const pyProcess = spawn(pythonPath, args);
    session.process = pyProcess;

    if (isRestart) {
        // Notify all existing listeners about the reset/new history
        broadcastToSession(sessionId, 'session-history', session.history, session.commandHistory, session.inputDraft, session.name);
    }

    // Handle Output
    pyProcess.stdout.on('data', (data) => {
        const str = data.toString();
        session.stdoutBuffer += str;

        // Check if this looks like an input prompt (no trailing newline)
        // Python's input() writes the prompt to stdout without a newline
        if (!str.endsWith('\n')) {
            // This might be an input prompt - wait a bit to see if more data comes
            setTimeout(() => {
                // If buffer still doesn't end with newline, it's likely an input prompt
                if (session.stdoutBuffer && !session.stdoutBuffer.endsWith('\n')) {
                    const promptText = session.stdoutBuffer;
                    session.waitingForInput = true;

                    // Signal that we're waiting for input (don't emit as output yet)
                    broadcastToSession(sessionId, 'session-input-prompt', promptText);

                    session.stdoutBuffer = '';
                }
            }, 50); // Small delay to catch any buffered data
        } else {
            // Normal output with newline
            const entry = { type: 'stdout', text: session.stdoutBuffer };
            session.history.push(entry);
            broadcastToSession(sessionId, 'session-output', entry);
            session.stdoutBuffer = '';
        }
    });

    pyProcess.stderr.on('data', (data) => {
        let str = data.toString();
        // Console logging for debugging (will show in terminal)
        console.log(`STDERR DATA: ${JSON.stringify(str)}`);

        // Strip ANSI codes (simple regex)
        // eslint-disable-next-line no-control-regex
        str = str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

        session.stderrBuffer += str;

        let promptFound = null;
        let promptLen = 0;

        // Check for recognized prompts at the end of the buffer using Regex
        // We look for >>> optionally followed by space, or ... optionally followed by space
        // at the very end of the buffer.

        const standardMatch = session.stderrBuffer.match(/>>> ?$/);
        const continuationMatch = session.stderrBuffer.match(/\.\.\. ?$/);

        if (standardMatch) {
            promptFound = 'standard';
            promptLen = standardMatch[0].length;
        } else if (continuationMatch) {
            promptFound = 'continuation';
            promptLen = continuationMatch[0].length;
        }

        if (promptFound) {
            // Emit everything before the prompt as actual stderr
            const text = session.stderrBuffer.slice(0, -promptLen);
            if (text) {
                const entry = { type: 'stderr', text: text };
                session.history.push(entry);
                broadcastToSession(sessionId, 'session-output', entry);
            }

            // Emit prompt event
            broadcastToSession(sessionId, 'session-prompt', promptFound);

            // Save state
            session.lastPromptType = promptFound;
            session.lastPrompt = (promptFound === 'standard') ? '>>>' : '...';

            // Clear buffer
            session.stderrBuffer = '';

            // Debug log
            console.log(`Detected prompt: ${promptFound}`);
        } else {
            // No prompt found (yet). 
            // Flush complete lines to avoid lag, but keep the tail which might be a partial prompt.
            const idx = session.stderrBuffer.lastIndexOf('\n');
            if (idx !== -1) {
                const text = session.stderrBuffer.slice(0, idx + 1);
                const entry = { type: 'stderr', text: text };
                session.history.push(entry);
                broadcastToSession(sessionId, 'session-output', entry);

                session.stderrBuffer = session.stderrBuffer.slice(idx + 1);
            }
        }
    });

    pyProcess.on('close', (code) => {
        // Check if this process is still the active one for the session
        // If we restarted, session.process has been updated to the new process
        if (session.process && session.process !== pyProcess) {
            return; // Ignore old process exit
        }

        const entry = { type: 'meta', text: `\n[Process exited with code ${code}]\n` };
        session.history.push(entry);
        broadcastToSession(sessionId, 'session-exit', code);
        // Delay deletion?
        sessions.delete(sessionId);
    });
});

ipcMain.on('session-input', (event, sessionId, input, isInputResponse) => {
    const session = sessions.get(sessionId);
    if (session) {
        // If we were waiting for input (detected by backend) or renderer tells us it's an input response
        if (session.waitingForInput || isInputResponse) {
            // Just send the input to Python, the renderer will handle echoing
            session.waitingForInput = false;
            if (session.process) {
                session.process.stdin.write(input + '\n');
            }
        } else {
            // Normal command - record and echo
            const entry = { type: 'input', text: input, prompt: session.lastPrompt || '>>>' };
            session.history.push(entry);
            session.commandHistory.push(input);

            broadcastToSession(sessionId, 'session-output', entry); // Echo to all views

            if (session.process) {
                session.process.stdin.write(input + '\n');
            }
        }
    }
});

// Sync input draft
ipcMain.on('session-input-draft', (event, sessionId, draft) => {
    const session = sessions.get(sessionId);
    if (session) {
        session.inputDraft = draft;
        broadcastToSession(sessionId, 'session-input-draft', draft);
    }
});

ipcMain.on('session-kill', (event, sessionId) => {
    const session = sessions.get(sessionId);
    if (session && session.process) {
        session.process.kill();
        // Determine cleanup via 'close' event handler to ensure exit is broadcasted
    }
});

ipcMain.on('session-attach', (event, sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
        session.listeners.add(event.sender);
        // Send history upon attach
        event.sender.send('session-history', sessionId, session.history, session.commandHistory, session.inputDraft, session.name);

        // Remove listener when window closes (sender destroyed)
        event.sender.once('destroyed', () => {
            if (sessions.has(sessionId)) {
                sessions.get(sessionId).listeners.delete(event.sender);
            }
        });
    }
});

ipcMain.on('session-detach', (event, sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
        session.listeners.delete(event.sender);
    }
});

// Explicit session close (removes from UI)
ipcMain.on('session-close', (event, sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
        // Notify listeners to remove UI
        session.listeners.forEach(wc => {
            if (!wc.isDestroyed()) wc.send('session-closed', sessionId);
        });

        if (session.process) {
            session.process.kill();
        }
        sessions.delete(sessionId);
    }
});

// Track windows by Session ID
const sessionWindows = new Map();

ipcMain.on('pop-out-session', (event, sessionId, title) => {
    if (sessionWindows.has(sessionId)) {
        const existingWin = sessionWindows.get(sessionId);
        if (!existingWin.isDestroyed()) {
            existingWin.focus();
            if (title) existingWin.setTitle(title);
            return;
        }
    }

    const subWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: title || `Shell ${sessionId}`,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    subWin.loadFile('console.html');
    poppedConsoles.push(subWin);
    sessionWindows.set(sessionId, subWin);

    // Pass session ID to the new window
    subWin.webContents.once('did-finish-load', () => {
        subWin.webContents.send('attach-to-session', sessionId);
    });

    subWin.on('closed', () => {
        const idx = poppedConsoles.indexOf(subWin);
        if (idx > -1) poppedConsoles.splice(idx, 1);
        sessionWindows.delete(sessionId);
    });
});


ipcMain.on('close-popped-consoles', () => {
    poppedConsoles.forEach(w => w.close());
    poppedConsoles = [];
});

ipcMain.on('update-menu-checkbox', (event, menuId, checked) => {
    const menu = Menu.getApplicationMenu();
    const item = menu.getMenuItemById(menuId);
    if (item) {
        item.checked = checked;
    }
});



