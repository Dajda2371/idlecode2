const { app, BrowserWindow, Menu, dialog, shell } = require('electron')
const path = require('path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
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
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
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
                    click: (menuItem) => win.webContents.send('toggle-explorer', menuItem.checked)
                },
                {
                    label: 'Console',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => win.webContents.send('toggle-console', menuItem.checked)
                },
                {
                    label: 'AI Agent',
                    type: 'checkbox',
                    checked: true,
                    click: (menuItem) => win.webContents.send('toggle-ai-agent', menuItem.checked)
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

const { ipcMain } = require('electron');

ipcMain.on('pop-out-console', () => {
    const consoleWin = new BrowserWindow({
        width: 800,
        height: 600,
        title: 'IDLE Console',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    consoleWin.loadFile('console.html');
});

ipcMain.on('save-file', () => {
    // handled in renderer or we can add logic here if needed
});

app.whenReady().then(() => {
    createWindow()


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
