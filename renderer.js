const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = process.cwd();
const ICONS = {
    folder: 'folder',
    folderOpen: 'folder_open',
    file: 'description',
    python: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGsPM0pa6it1ik4ALfAseYsiUBtja_odQXYtSkBWckk_7seMGRxLVh19PyQnvSzqoSwjRb4doee1McFxJSSwtbjjiAwm-g3I-dfurW3cDOZLMOLrd8cJozhy1zC_2WWYJn91tjN_Ag74No_pmmqIK-OndotvzzYPESrPODIS6oPQ3KLccIIWDH7yT9YCmSVG9jt4YG5fqvUcqxZynsGt0wgO5U2cGdAKqfEKkcAXEIlV98_WvWEa6hCLzFH8h1dyU3bZ_sswlEu5A'
};

const treeContainer = document.getElementById('file-tree');
const codeContent = document.getElementById('code-content');
const lineNumbers = document.getElementById('line-numbers');
const contextMenu = document.getElementById('file-context-menu');

// Context Menu State
let ctxTarget = null;
let ctxPath = null;
let ctxIsDir = false;

// UI Elements for Menu
const ctxRename = document.getElementById('ctx-rename');
const ctxDelete = document.getElementById('ctx-delete');
const ctxSeparator = contextMenu.querySelector('.border-b');

// Initial Load
loadDirectory(PROJECT_ROOT, treeContainer);

// Global Click to close context menu
document.addEventListener('click', () => {
    if (!contextMenu.classList.contains('hidden')) {
        contextMenu.classList.add('hidden');
    }
});

// Empty Space Context Menu (Root Level)
treeContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // If propagation was stopped by an item, this won't run.
    console.log('Root context menu triggered');

    // Clear selection when clicking empty space
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));

    ctxTarget = { row: null, parent: treeContainer, childrenContainer: null, fullPath: PROJECT_ROOT };
    ctxPath = PROJECT_ROOT;
    ctxIsDir = true;

    // Show only New File/Folder
    ctxRename.style.display = 'none';
    ctxDelete.style.display = 'none';
    if (ctxSeparator) ctxSeparator.style.display = 'none';

    // Position Menu
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.classList.remove('hidden');
});

function loadDirectory(dirPath, container) {
    container.innerHTML = '';
    fs.readdir(dirPath, { withFileTypes: true }, (err, dirents) => {
        if (err) return console.error(err);

        // Sort: Folders first, then files
        dirents.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        dirents.forEach(dirent => {
            if (dirent.name.startsWith('.') && dirent.name !== '.gitignore') return;
            if (dirent.name === 'node_modules') return;

            const itemPath = path.join(dirPath, dirent.name);
            const itemElement = createTreeItem(dirent, itemPath, container);
            container.appendChild(itemElement);
        });
    });
}

function createTreeItem(dirent, fullPath, parentContainer) {
    const isDir = dirent.isDirectory();
    const itemContainer = document.createElement('div');
    const itemRow = document.createElement('div');

    itemRow.className = 'tree-item select-none';
    itemRow.style.paddingLeft = '10px';

    // Icon Logic
    const iconSpan = document.createElement('span');
    if (isDir) {
        iconSpan.className = 'material-symbols-outlined !text-[16px] text-gray-500';
        iconSpan.textContent = 'keyboard_arrow_right';
    } else {
        if (dirent.name.endsWith('.py')) {
            const img = document.createElement('img');
            img.src = ICONS.python;
            img.className = 'w-3.5 h-3.5';
            iconSpan.appendChild(img);
        } else {
            iconSpan.className = 'material-symbols-outlined !text-[16px] text-gray-400';
            iconSpan.textContent = 'description';
        }
    }

    const label = document.createElement('span');
    label.textContent = dirent.name;
    label.className = 'ml-1';

    itemRow.appendChild(iconSpan);
    itemRow.appendChild(label);
    itemContainer.appendChild(itemRow);

    // Children Container (for folders)
    let childrenContainer = null;
    if (isDir) {
        childrenContainer = document.createElement('div');
        childrenContainer.className = 'ml-3 border-l border-gray-200 hidden';
        itemContainer.appendChild(childrenContainer);
    }

    // Event Handling
    itemRow.addEventListener('click', (e) => {
        e.stopPropagation();

        // Remove active state
        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));
        itemRow.classList.add('bg-blue-100', 'text-blue-600');

        if (isDir) {
            const isHidden = childrenContainer.classList.contains('hidden');
            if (isHidden) {
                childrenContainer.classList.remove('hidden');
                iconSpan.textContent = 'keyboard_arrow_down';
                if (childrenContainer.children.length === 0) {
                    loadDirectory(fullPath, childrenContainer);
                }
            } else {
                childrenContainer.classList.add('hidden');
                iconSpan.textContent = 'keyboard_arrow_right';
            }
        } else {
            openFile(fullPath);
        }
    });

    itemRow.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Highlight logic
        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-600'));
        itemRow.classList.add('bg-blue-100', 'text-blue-600');

        ctxTarget = { row: itemRow, parent: parentContainer, childrenContainer: childrenContainer, fullPath: fullPath };
        ctxPath = fullPath;
        ctxIsDir = isDir;

        // Ensure full menu is shown
        ctxRename.style.display = 'block';
        ctxDelete.style.display = 'block';
        if (ctxSeparator) ctxSeparator.style.display = 'block';

        // Position Menu
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.classList.remove('hidden');
    });

    return itemContainer;
}

// Context Menu Actions
document.getElementById('ctx-new-file').addEventListener('click', () => createItemUI(false));
document.getElementById('ctx-new-folder').addEventListener('click', () => createItemUI(true));
document.getElementById('ctx-rename').addEventListener('click', () => renameItemUI());
document.getElementById('ctx-delete').addEventListener('click', () => deleteItem());

function createItemUI(isFolder) {
    if (!ctxTarget) return;

    // Determine target container
    let containerToAdd;
    let basePath;

    // If clicking root (empty space)
    if (ctxTarget.parent === treeContainer && !ctxTarget.row) {
        containerToAdd = treeContainer;
        basePath = PROJECT_ROOT;
    } else {
        // Normal item click
        containerToAdd = ctxTarget.parent;
        basePath = path.dirname(ctxPath);

        // If clicking a folder that is expanded, add inside
        if (ctxIsDir && ctxTarget.childrenContainer && !ctxTarget.childrenContainer.classList.contains('hidden')) {
            containerToAdd = ctxTarget.childrenContainer;
            basePath = ctxPath;
        }
    }

    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex items-center gap-1.5 px-2 py-0.5 ml-3 bg-blue-50';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined !text-[16px] text-gray-400';
    icon.textContent = isFolder ? 'folder' : 'description';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-[13px] border border-blue-400 px-1 py-0.5 w-full outline-none';
    input.value = isFolder ? 'New Folder' : 'new_file.py';

    inputContainer.appendChild(icon);
    inputContainer.appendChild(input);

    // Insert Logic: 
    // If root/empty space click, just append or prepend? Prepend looks better.
    if (containerToAdd.firstChild) {
        containerToAdd.insertBefore(inputContainer, containerToAdd.firstChild);
    } else {
        containerToAdd.appendChild(inputContainer);
    }

    input.focus();
    input.select();

    const commitCreation = () => {
        const name = input.value.trim();
        if (!name) {
            inputContainer.remove();
            return;
        }

        const newPath = path.join(basePath, name);

        try {
            if (isFolder) {
                fs.mkdirSync(newPath);
            } else {
                fs.writeFileSync(newPath, '');
            }
            loadDirectory(basePath, containerToAdd);
        } catch (err) {
            console.error(err);
            alert(`Error creating item: ${err.message}`);
            inputContainer.remove();
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitCreation();
        if (e.key === 'Escape') inputContainer.remove();
    });

    input.addEventListener('blur', () => {
        if (document.activeElement !== input) commitCreation();
    });
}

function renameItemUI() {
    if (!ctxTarget || !ctxTarget.row) return; // Cannot rename root

    const row = ctxTarget.row;
    const labelSpan = row.querySelector('span:last-child');
    const oldName = labelSpan.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-[13px] border border-blue-400 px-1 py-0.5 w-full outline-none ml-1';
    input.value = oldName;

    labelSpan.replaceWith(input);
    input.focus();
    input.select();

    input.addEventListener('click', e => e.stopPropagation());

    const commitRename = () => {
        const newName = input.value.trim();
        if (!newName || newName === oldName) {
            input.replaceWith(labelSpan);
            return;
        }

        const newPath = path.join(path.dirname(ctxPath), newName);

        try {
            fs.renameSync(ctxPath, newPath);
            loadDirectory(path.dirname(ctxPath), ctxTarget.parent);
        } catch (err) {
            console.error(err);
            alert(`Error renaming: ${err.message}`);
            input.replaceWith(labelSpan);
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') input.replaceWith(labelSpan);
    });

    input.addEventListener('blur', commitRename);
}

function deleteItem() {
    if (!ctxTarget || !ctxTarget.row) return;
    if (!confirm(`Are you sure you want to delete '${path.basename(ctxPath)}'?`)) return;

    try {
        fs.rmSync(ctxPath, { recursive: true, force: true });
        loadDirectory(path.dirname(ctxPath), ctxTarget.parent);
    } catch (err) {
        console.error(err);
        alert(`Error deleting: ${err.message}`);
    }
}


function openFile(filePath) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return console.error(err);
        document.title = `${path.basename(filePath)} - ${filePath}`;
        renderCode(data);
    });
}

function renderCode(content) {
    const lines = content.split('\n');
    const lineNumbers = document.getElementById('line-numbers');
    const codeContent = document.getElementById('code-content');

    if (!lineNumbers || !codeContent) return;

    lineNumbers.innerHTML = '';
    codeContent.innerHTML = '';

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const numDiv = document.createElement('div');
        numDiv.textContent = lineNum;
        numDiv.className = 'h-5';
        lineNumbers.appendChild(numDiv);

        const lineDiv = document.createElement('div');
        lineDiv.className = 'h-5 whitespace-pre';

        let processedLine = escapeHtml(line);
        processedLine = processedLine.replace(/\b(import|from|def|class|return|if|else|elif|for|while|try|except)\b/g, '<span class="syntax-keyword">$1</span>');
        processedLine = processedLine.replace(/\b(print|len|range|open)\b/g, '<span class="syntax-builtin">$1</span>');
        processedLine = processedLine.replace(/('.*?'|".*?")/g, '<span class="syntax-string">$1</span>');
        processedLine = processedLine.replace(/(#.*)$/g, '<span class="syntax-comment">$1</span>');

        lineDiv.innerHTML = processedLine || ' ';
        codeContent.appendChild(lineDiv);
    });
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.toggleMenu = (menuId) => {
};
