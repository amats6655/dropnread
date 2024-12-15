document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.querySelector('.drop-zone');
    const loader = document.querySelector('.loader');
    const currentFile = document.querySelector('.current-file');
    const resultContainer = document.querySelector('.result-container');
    const resultTextarea = document.getElementById('result');
    const excludePatternsText = document.getElementById('exclude-patterns');
    const copyBtn = document.getElementById('copy-btn');
    const dropStatus = document.getElementById('drop-status');
    const warningDiv = document.getElementById('size-warning');
    const warningTitle = document.getElementById('warning-title');
    const warningMessage = document.getElementById('warning-message');

    let result = '';
    let processedFilesCount = 0;

    // Add these constants at the top
    let MAX_TOKENS = 128000; // GPT-4's limit
    let CHARS_PER_TOKEN = 4; // Rough estimation
    let MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

    // Add near other constants
    const COMMENT_PATTERNS = {
        // Single line and multi-line comment patterns for different languages
        '.js': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.jsx': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.ts': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.tsx': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.py': [/#.*$/gm, /'''[\s\S]*?'''/g, /"""[\s\S]*?"""/g],
        '.php': [/\/\/.*$/gm, /#.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.java': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.c': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.cpp': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.h': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.hpp': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.cs': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.rb': [/#.*$/gm, /=begin[\s\S]*?=end/g],
        '.sh': [/#.*$/gm],
        '.bash': [/#.*$/gm],
        '.go': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        '.rs': [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
    };

    // Add with other constants at the top
    const stripCommentsCheckbox = document.getElementById('strip-comments');
    const includeBinaryCheckbox = document.getElementById('include-binary');

    // Add a button for directory selection
    const selectDirBtn = document.createElement('button');
    selectDirBtn.textContent = 'Select Directory';
    selectDirBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200';
    dropZone.appendChild(selectDirBtn);

    selectDirBtn.addEventListener('click', async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            await processDirectoryHandle(dirHandle);
        } catch (error) {
            console.error('Error selecting directory:', error);
            dropStatus.textContent = 'Error selecting directory';
        }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const items = e.dataTransfer.items;
        if (items.length === 0) {
            dropStatus.textContent = 'No files dropped';
            return;
        }
        
        // Try to get directory handle from dropped items
        try {
            const item = items[0];
            if (item.kind === 'file') {
                const handle = await item.getAsFileSystemHandle();
                if (handle.kind === 'directory') {
                    await processDirectoryHandle(handle);
                } else {
                    // Handle single file
                    const file = await handle.getFile();
                    result = await file.text();
                    displayResult();
                }
            }
        } catch (error) {
            console.error('Error processing drop:', error);
            dropStatus.textContent = 'Error processing dropped items. Try using the Select Directory button instead.';
        }
    });

    async function processDirectoryHandle(dirHandle, path = '') {
        const excludePatterns = excludePatternsText.value
            .split('\n')
            .filter(pattern => pattern.trim())
            .map(pattern => new RegExp(pattern.trim()
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')));

        loader.classList.remove('hidden');
        result = '';
        resultContainer.classList.add('hidden');
        warningDiv.classList.add('hidden');  // Hide any previous warnings
        processedFilesCount = 0;
        document.getElementById('files-counter').textContent = '0';
        
        // Scroll loader into view
        loader.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
        
        try {
            const hitLimit = await readDirectory(dirHandle, excludePatterns);
            if (!hitLimit) {
                displayResult();
            }
        } catch (error) {
            console.error('Error processing directory:', error);
            dropStatus.textContent = 'Error processing directory';
        }
    }

    // Add this after the constants
    const TEXT_FILE_EXTENSIONS = new Set([
        // Web files
        '.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.xml', '.svg', '.md', '.mdx',
        // Config files
        '.env', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config',
        // Programming languages
        '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.php', '.rb', '.go', '.rs', '.swift',
        '.kt', '.kts', '.scala', '.sh', '.bash', '.pl', '.pm', '.r', '.lua', '.sql',
        // Documentation
        '.txt', '.rtf', '.csv', '.log', '.readme',
        // Other text files
        '.gitignore', '.dockerignore', '.editorconfig'
    ]);

    // Add this helper function
    function isTextFile(filename) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        return TEXT_FILE_EXTENSIONS.has(ext);
    }

    // Add this function
    function stripComments(content, extension) {
        const patterns = COMMENT_PATTERNS[extension];
        if (!patterns) return content;

        let result = content;
        for (const pattern of patterns) {
            result = result.replace(pattern, '');
        }
        
        // Remove empty lines and normalize spacing
        return result
            .split('\n')
            .filter(line => line.trim())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
    }

    // Update the readDirectory function
    async function readDirectory(dirHandle, excludePatterns, path = '') {
        for await (const entry of dirHandle.values()) {
            const fullPath = path + entry.name;
            
            if (excludePatterns.some(pattern => pattern.test(fullPath))) {
                continue;
            }

            currentFile.textContent = fullPath;
            
            try {
                if (entry.kind === 'file') {
                    processedFilesCount++;
                    document.getElementById('files-counter').textContent = processedFilesCount;

                    if (isTextFile(entry.name)) {
                        const file = await entry.getFile();
                        let content = await file.text();
                        
                        if (stripCommentsCheckbox.checked) {
                            const ext = '.' + entry.name.split('.').pop().toLowerCase();
                            if (COMMENT_PATTERNS[ext]) {
                                content = stripComments(content, ext);
                            }
                        }
                        
                        const pattern = document.getElementById('format-pattern').value;
                        const newContent = pattern
                            .replace('{path}', path)
                            .replace('{filename}', entry.name)
                            .replace('{content}', content)
                            .replace(/{newline}/g, '\n');
                        
                        if ((result.length + newContent.length) > MAX_CHARS) {
                            result = '';
                            warningDiv.classList.remove('hidden');
                            warningTitle.textContent = '⚠️ Project Too Large';
                            warningMessage.textContent = 
                                `Processing stopped: Project would exceed the ${MAX_TOKENS.toLocaleString()} token limit. ` +
                                `Try excluding more files or using a model with a larger context window.`;
                            loader.classList.add('hidden');
                            
                            // Scroll warning into view
                            warningDiv.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start'
                            });
                            
                            return true; // Indicate we hit the limit
                        }
                        
                        result += newContent;
                    } else if (includeBinaryCheckbox.checked) { // Only process binary files if checkbox is checked
                        const newContent = `// File: ${fullPath}\n\n`;
                        if ((result.length + newContent.length) > MAX_CHARS) {
                            result = '';
                            warningDiv.classList.remove('hidden');
                            warningTitle.textContent = '⚠️ Project Too Large';
                            warningMessage.textContent = 
                                `Processing stopped: Project would exceed the ${MAX_TOKENS.toLocaleString()} token limit. ` +
                                `Try excluding more files or using a model with a larger context window.`;
                            loader.classList.add('hidden');
                            
                            // Scroll warning into view
                            warningDiv.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start'
                            });
                            
                            return true; // Indicate we hit the limit
                        }
                        result += newContent;
                    }
                } else if (entry.kind === 'directory') {
                    if (await readDirectory(entry, excludePatterns, `${fullPath}/`)) {
                        return true; // Propagate the limit hit up the call stack
                    }
                }
            } catch (error) {
                console.error(`Error processing ${fullPath}:`, error);
                dropStatus.textContent = `Error processing: ${fullPath}`;
            }
        }
        return false; // Indicate we didn't hit the limit
    }

    function displayResult() {
        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');
        resultTextarea.value = result;
        updateStats();
        
        // Scroll to result container with smooth animation
        resultContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
        });
    }

    function updateStats() {
        const text = resultTextarea.value;
        const chars = text.length;
        const words = text.split(/\s+/).filter(Boolean).length;
        const tokens = Math.ceil(chars / CHARS_PER_TOKEN);
        
        document.getElementById('char-count').textContent = `${chars.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
        document.getElementById('word-count').textContent = words.toLocaleString();
        document.getElementById('token-count').textContent = `${tokens.toLocaleString()} / ${MAX_TOKENS.toLocaleString()}`;
        
        // Add warning class if close to limit
        const tokenCount = document.getElementById('token-count');
        if (tokens > MAX_TOKENS * 0.9) {
            tokenCount.classList.add('text-red-500');
        } else if (tokens > MAX_TOKENS * 0.75) {
            tokenCount.classList.add('text-yellow-500');
        } else {
            tokenCount.classList.remove('text-red-500', 'text-yellow-500');
        }
    }

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultTextarea.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy to Clipboard';
        }, 2000);
    });

    // Add near the top with other constants
    MAX_TOKENS = 128000;
    const modelSelect = document.getElementById('model-select');

    modelSelect.addEventListener('change', () => {
        MAX_TOKENS = parseInt(modelSelect.value);
        MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;
        updateStats(); // Update display with new limits
    });
}); 