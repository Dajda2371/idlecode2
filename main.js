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
                        // Placeholder for now, or trigger explorer creation if possible
                        dialog.showMessageBox(win, { message: 'To create a new file, right-click in the file explorer sidebar.' });
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
                { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O' },
                { label: 'Recent Folders', submenu: [{ label: 'No Recent Folders', enabled: false }] },
                { type: 'separator' },
                { label: 'Open Module...', accelerator: 'Alt+M' },
                { label: 'Module Browser', accelerator: 'Alt+C' },
                { label: 'Path Browser' },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        // Current editor is read-only, acts as a viewer
                        // But we can trigger a 'save' event if we eventually add editing
                        win.webContents.send('save-file')
                    }
                },
                { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S' },
                { label: 'Save Copy As...', accelerator: 'Alt+Shift+S' },
                { type: 'separator' },
                { label: 'Auto-Save', type: 'checkbox', checked: false },
                { type: 'separator' },
                { label: 'Print Window', accelerator: 'CmdOrCtrl+P' },
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
                { label: 'Find...', accelerator: 'CmdOrCtrl+F' },
                { label: 'Find Again', accelerator: 'CmdOrCtrl+G' },
                { label: 'Find Selection', accelerator: 'CmdOrCtrl+F3' },
                { label: 'Find in Files...', accelerator: 'Alt+F3' },
                { label: 'Replace...', accelerator: 'CmdOrCtrl+H' },
                { type: 'separator' },
                { label: 'Go to Line', accelerator: 'Alt+G' },
                { label: 'Show Completions', accelerator: 'Control+Space' },
                { label: 'Expand Word', accelerator: 'Alt+/' },
                { label: 'Show Call Tip', accelerator: 'CmdOrCtrl+\\' },
                { label: 'Show Surrounding Parens', accelerator: 'CmdOrCtrl+0' }
            ]
        },
        {
            label: 'Shell',
            submenu: [
                { label: 'View Last Restart', accelerator: 'F6' },
                { label: 'Restart Shell', accelerator: 'CmdOrCtrl+F6' },
                { type: 'separator' },
                { label: 'Previous History', accelerator: 'Alt+P' },
                { label: 'Next History', accelerator: 'Alt+N' },
                { type: 'separator' },
                { label: 'Interrupt Execution', accelerator: 'CmdOrCtrl+C' }
            ]
        },
        {
            label: 'Debug',
            submenu: [
                { label: 'Go to File/Line' },
                { label: 'Debugger' },
                { label: 'Stack Viewer' },
                { label: 'Auto-open Stack Viewer' }
            ]
        },
        {
            label: 'Options',
            submenu: [
                { label: 'Configure IDLE' },
                { type: 'separator' },
                { label: 'Show Code Context' },
                { label: 'Show Line Numbers' },
                { label: 'Zoom Height', accelerator: 'Alt+2' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { label: '*IDLE Shell 3.13.12*' },
                { type: 'separator' },
                { label: 'Explorer', type: 'checkbox', checked: true },
                { label: 'Console', type: 'checkbox', checked: true },
                { label: 'AI Agent', type: 'checkbox', checked: true }
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
