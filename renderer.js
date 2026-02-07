const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = process.cwd(); // Start in current directory
const ICONS = {
    folder: 'folder',
    folderOpen: 'folder_open',
    file: 'description',
    python: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGsPM0pa6it1ik4ALfAseYsiUBtja_odQXYtSkBWckk_7seMGRxLVh19PyQnvSzqoSwjRb4doee1McFxJSSwtbjjiAwm-g3I-dfurW3cDOZLMOLrd8cJozhy1zC_2WWYJn91tjN_Ag74No_pmmqIK-OndotvzzYPESrPODIS6oPQ3KLccIIWDH7yT9YCmSVG9jt4YG5fqvUcqxZynsGt0wgO5U2cGdAKqfEKkcAXEIlV98_WvWEa6hCLzFH8h1dyU3bZ_sswlEu5A'
};

const treeContainer = document.getElementById('file-tree');
const codeContent = document.getElementById('code-content');
const lineNumbers = document.getElementById('line-numbers');
const currentFileLabel = document.getElementById('current-file-label');

// Initial Load
loadDirectory(PROJECT_ROOT, treeContainer);

function loadDirectory(dirPath, container) {
    fs.readdir(dirPath, { withFileTypes: true }, (err, dirents) => {
        if (err) return console.error(err);

        // Sort: Folders first, then files
        dirents.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        dirents.forEach(dirent => {
            if (dirent.name.startsWith('.') && dirent.name !== '.gitignore') return; // Skip hidden files except gitignore
            if (dirent.name === 'node_modules') return;

            const itemPath = path.join(dirPath, dirent.name);
            const itemElement = createTreeItem(dirent, itemPath);
            container.appendChild(itemElement);
        });
    });
}

function createTreeItem(dirent, fullPath) {
    const isDir = dirent.isDirectory();
    const itemContainer = document.createElement('div');
    const itemRow = document.createElement('div');

    // Styling matches the existing design
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
        childrenContainer.className = 'ml-3 border-l border-gray-200 hidden'; // Indent children
        itemContainer.appendChild(childrenContainer);
    }

    // Event Handling
    itemRow.addEventListener('click', (e) => {
        e.stopPropagation();

        // Remove active state from all items
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

    return itemContainer;
}

function openFile(filePath) {
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) return console.error(err);

        // Update Label
        if (currentFileLabel) {
            currentFileLabel.textContent = `${path.basename(filePath)} - ${filePath}`;
        }

        // Render Content
        renderCode(data);
    });
}

function renderCode(content) {
    // Basic Syntax Highlighting (very naive)
    const lines = content.split('\n');

    // Clear existing
    lineNumbers.innerHTML = '';
    codeContent.innerHTML = '';

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Line Number
        const numDiv = document.createElement('div');
        numDiv.textContent = lineNum;
        numDiv.className = 'h-5'; // Fixed height
        lineNumbers.appendChild(numDiv);

        // Code Line
        const lineDiv = document.createElement('div');
        lineDiv.className = 'h-5 whitespace-pre'; // Fixed height

        // Simple highlighting
        let processedLine = escapeHtml(line);
        processedLine = processedLine.replace(/\b(import|from|def|class|return|if|else|elif|for|while|try|except)\b/g, '<span class="syntax-keyword">$1</span>');
        processedLine = processedLine.replace(/\b(print|len|range|open)\b/g, '<span class="syntax-builtin">$1</span>');
        processedLine = processedLine.replace(/('.*?'|".*?")/g, '<span class="syntax-string">$1</span>');
        processedLine = processedLine.replace(/(#.*)$/g, '<span class="syntax-comment">$1</span>');

        lineDiv.innerHTML = processedLine || ' '; // Ensure empty lines take up space
        codeContent.appendChild(lineDiv);
    });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
