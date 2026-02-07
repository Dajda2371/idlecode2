const { app, BrowserWindow, Menu } = require('electron')
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
}

const template = [
    {
        label: 'File',
        submenu: [
            { label: 'New File', accelerator: 'CmdOrCtrl+N' },
            { label: 'Open...', accelerator: 'CmdOrCtrl+O' },
            { label: 'Open Module...', accelerator: 'Alt+M' },
            { label: 'Recent Files', submenu: [{ label: 'No Recent Files', enabled: false }] },
            { label: 'Module Browser', accelerator: 'Alt+C' },
            { label: 'Path Browser' },
            { type: 'separator' },
            { label: 'Save', accelerator: 'CmdOrCtrl+S' },
            { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S' },
            { label: 'Save Copy As...', accelerator: 'Alt+Shift+S' },
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
            { label: 'AI Agent', type: 'checkbox', checked: true }
        ]
    },
    {
        label: 'Help',
        submenu: [
            { label: 'About IDLE' },
            { type: 'separator' },
            { label: 'IDLE Doc' },
            { label: 'Python Docs', accelerator: 'F1' },
            { label: 'Turtle Demo' },
            { type: 'separator' },
            { label: 'Report IdleCode issue' }
        ]
    }
];

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

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
