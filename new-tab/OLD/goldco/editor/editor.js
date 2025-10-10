// ==================== STATE ====================
let bookmarksData = { cards: [] };
let validationErrors = [];

// ==================== CONSTANTS ====================
const VALID_PATTERNS = ['sky', 'pink', 'purple', 'indigo', 'green', 'slate', 'orange', 'zinc', 'brown'];
const ICON_TYPES = ['emoji', 'local', 'url'];

// ==================== UTILITY FUNCTIONS ====================

// Slugify text: convert to lowercase, replace spaces with hyphens
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-');      // Replace multiple hyphens with single
}

// Generate unique ID
function generateUniqueId(label, existingIds) {
    let baseId = slugify(label);
    let finalId = baseId;
    let counter = 2;

    // Check if ID exists and append number if needed
    while (existingIds.includes(finalId)) {
        finalId = `${baseId}-${counter}`;
        counter++;
    }

    return finalId;
}

// Get all existing IDs
function getAllIds() {
    const ids = [];
    bookmarksData.cards.forEach(card => {
        ids.push(card.id);
        card.bookmarks.forEach(bookmark => {
            ids.push(bookmark.id);
            if (bookmark.children) {
                bookmark.children.forEach(child => {
                    ids.push(child.id);
                });
            }
        });
    });
    return ids;
}

// ==================== VALIDATION ====================

function validateData() {
    validationErrors = [];
    const allIds = [];

    // Validate cards
    bookmarksData.cards.forEach((card, cardIndex) => {
        // Check required fields
        if (!card.id || card.id.trim() === '') {
            validationErrors.push(`Card ${cardIndex + 1}: Missing required field 'id'`);
        }
        if (!card.title || card.title.trim() === '') {
            validationErrors.push(`Card ${cardIndex + 1}: Missing required field 'title'`);
        }

        // Check for duplicate IDs
        if (card.id && allIds.includes(card.id)) {
            validationErrors.push(`Card '${card.title}': Duplicate ID '${card.id}'`);
        } else if (card.id) {
            allIds.push(card.id);
        }

        // Validate pattern
        if (card.pattern && !VALID_PATTERNS.includes(card.pattern)) {
            validationErrors.push(`Card '${card.title}': Invalid pattern '${card.pattern}'`);
        }

        // Validate bookmarks
        if (card.bookmarks) {
            card.bookmarks.forEach((bookmark, bookmarkIndex) => {
                validateBookmark(bookmark, `Card '${card.title}' → Bookmark ${bookmarkIndex + 1}`, allIds);
            });
        }
    });

    updateErrorDisplay();
    return validationErrors.length === 0;
}

function validateBookmark(bookmark, path, allIds) {
    // Check required fields
    if (!bookmark.id || bookmark.id.trim() === '') {
        validationErrors.push(`${path}: Missing required field 'id'`);
    }
    if (!bookmark.label || bookmark.label.trim() === '') {
        validationErrors.push(`${path}: Missing required field 'label'`);
    }
    if (!bookmark.url || bookmark.url.trim() === '') {
        validationErrors.push(`${path}: Missing required field 'url'`);
    }

    // Check for duplicate IDs
    if (bookmark.id && allIds.includes(bookmark.id)) {
        validationErrors.push(`${path}: Duplicate ID '${bookmark.id}'`);
    } else if (bookmark.id) {
        allIds.push(bookmark.id);
    }

    // Validate URL
    if (bookmark.url && !bookmark.url.startsWith('http://') && !bookmark.url.startsWith('https://')) {
        validationErrors.push(`${path}: URL must start with http:// or https://`);
    }

    // Validate children (sub-bookmarks)
    if (bookmark.children && bookmark.children.length > 0) {
        bookmark.children.forEach((child, childIndex) => {
            validateBookmark(child, `${path} → Sub-bookmark ${childIndex + 1}`, allIds);
        });
    }
}

function updateErrorDisplay() {
    const errorSummary = document.getElementById('errorSummary');
    const errorCount = document.getElementById('errorCount');
    const errorList = document.getElementById('errorList');
    const downloadBtn = document.getElementById('downloadJsonBtn');
    const copyBtn = document.getElementById('copyToClipboardBtn');

    if (validationErrors.length > 0) {
        errorSummary.style.display = 'block';
        errorCount.textContent = validationErrors.length;
        errorList.innerHTML = validationErrors.map(err => `<li>${err}</li>`).join('');
        downloadBtn.disabled = true;
        copyBtn.disabled = true;
    } else {
        errorSummary.style.display = 'none';
        downloadBtn.disabled = false;
        copyBtn.disabled = false;
    }
}

// ==================== RENDERING ====================

function renderCards() {
    const container = document.getElementById('cardsContainer');
    container.innerHTML = '';

    bookmarksData.cards.forEach((card, cardIndex) => {
        const cardEl = createCardElement(card, cardIndex);
        container.appendChild(cardEl);
    });

    validateData();
}

function createCardElement(card, cardIndex) {
    const cardDiv = document.createElement('div');
    cardDiv.className = `card pattern-${card.pattern || 'slate'}`;
    cardDiv.dataset.cardIndex = cardIndex;

    // Card Header
    const headerDiv = document.createElement('div');
    headerDiv.className = 'card-header';
    headerDiv.innerHTML = `
        <div class="card-header-left">
            <span class="card-toggle">▶</span>
            <span class="card-title-display">${card.title || 'Untitled Card'}</span>
        </div>
        <div class="card-header-right">
            <button class="btn btn-duplicate" onclick="duplicateCard(${cardIndex})">Duplicate</button>
            <button class="btn btn-danger" onclick="deleteCard(${cardIndex})">Delete</button>
        </div>
    `;

    // Toggle expand/collapse
    headerDiv.addEventListener('click', (e) => {
        if (!e.target.classList.contains('btn')) {
            cardDiv.classList.toggle('expanded');
        }
    });

    // Card Body
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'card-body';
    bodyDiv.innerHTML = `
        <div class="form-group">
            <label>ID</label>
            <input type="text" value="${card.id || ''}" onchange="updateCardField(${cardIndex}, 'id', this.value)" />
        </div>
        <div class="form-group">
            <label>Title</label>
            <input type="text" value="${card.title || ''}" onchange="updateCardField(${cardIndex}, 'title', this.value)" />
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea onchange="updateCardField(${cardIndex}, 'description', this.value)">${card.description || ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Pattern</label>
                <select onchange="updateCardField(${cardIndex}, 'pattern', this.value)">
                    ${VALID_PATTERNS.map(p => `<option value="${p}" ${card.pattern === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Order</label>
                <input type="number" value="${card.order || 1}" onchange="updateCardField(${cardIndex}, 'order', parseInt(this.value))" />
            </div>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" ${card.enabled ? 'checked' : ''} onchange="updateCardField(${cardIndex}, 'enabled', this.checked)" />
            <label>Enabled</label>
        </div>

        <div class="bookmarks-container">
            <h4 style="margin-bottom: 12px;">Bookmarks</h4>
            <div id="bookmarks-${cardIndex}"></div>
            <button class="add-item-btn" onclick="addBookmark(${cardIndex})">+ Add Bookmark</button>
        </div>
    `;

    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(bodyDiv);

    // Render bookmarks after card is added to DOM
    setTimeout(() => {
        renderBookmarks(cardIndex);
    }, 0);

    return cardDiv;
}

function renderBookmarks(cardIndex) {
    const container = document.getElementById(`bookmarks-${cardIndex}`);
    if (!container) return;

    container.innerHTML = '';
    const bookmarks = bookmarksData.cards[cardIndex].bookmarks || [];

    bookmarks.forEach((bookmark, bookmarkIndex) => {
        const bookmarkEl = createBookmarkElement(bookmark, cardIndex, bookmarkIndex);
        container.appendChild(bookmarkEl);
    });
}

function createBookmarkElement(bookmark, cardIndex, bookmarkIndex, isSubBookmark = false) {
    const div = document.createElement('div');
    div.className = isSubBookmark ? 'sub-bookmark' : 'bookmark';

    div.innerHTML = `
        <div class="bookmark-header">
            <span class="bookmark-label">${bookmark.label || 'Untitled Bookmark'}</span>
            <div class="bookmark-actions">
                <button class="btn btn-duplicate" onclick="duplicateBookmark(${cardIndex}, ${bookmarkIndex}, ${isSubBookmark})">Duplicate</button>
                <button class="btn btn-danger" onclick="deleteBookmark(${cardIndex}, ${bookmarkIndex}, ${isSubBookmark})">Delete</button>
            </div>
        </div>

        <div class="form-group">
            <label>ID</label>
            <input type="text" value="${bookmark.id || ''}" onchange="updateBookmarkField(${cardIndex}, ${bookmarkIndex}, 'id', this.value, ${isSubBookmark})" />
        </div>
        <div class="form-group">
            <label>Label</label>
            <input type="text" value="${bookmark.label || ''}" onchange="updateBookmarkField(${cardIndex}, ${bookmarkIndex}, 'label', this.value, ${isSubBookmark})" />
        </div>
        <div class="form-group">
            <label>URL</label>
            <input type="text" value="${bookmark.url || ''}" onchange="updateBookmarkField(${cardIndex}, ${bookmarkIndex}, 'url', this.value, ${isSubBookmark})" />
        </div>
        <div class="form-row-3">
            <div class="form-group">
                <label>Icon Type</label>
                <select onchange="updateBookmarkField(${cardIndex}, ${bookmarkIndex}, 'iconType', this.value, ${isSubBookmark})">
                    ${ICON_TYPES.map(type => `<option value="${type}" ${bookmark.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Icon</label>
                <input type="text" value="${bookmark.icon || ''}" onchange="updateBookmarkField(${cardIndex}, ${bookmarkIndex}, 'icon', this.value, ${isSubBookmark})" />
            </div>
        </div>
        <div class="form-group">
            <label>Tags</label>
            <div class="tags-container">
                ${(bookmark.tags || []).map((tag, tagIndex) => `
                    <span class="tag">
                        ${tag}
                        <button class="tag-remove" onclick="removeTag(${cardIndex}, ${bookmarkIndex}, ${tagIndex}, ${isSubBookmark})">×</button>
                    </span>
                `).join('')}
                <input type="text" class="tag-input" placeholder="Add tag..." onkeypress="addTag(event, ${cardIndex}, ${bookmarkIndex}, ${isSubBookmark})" />
            </div>
        </div>
        ${!isSubBookmark ? `
            <div class="sub-bookmarks-container">
                <div id="sub-bookmarks-${cardIndex}-${bookmarkIndex}"></div>
                <button class="add-item-btn" onclick="addSubBookmark(${cardIndex}, ${bookmarkIndex})">+ Add Sub-Bookmark</button>
            </div>
        ` : ''}
    `;

    // Render sub-bookmarks if not a sub-bookmark itself
    if (!isSubBookmark && bookmark.children && bookmark.children.length > 0) {
        setTimeout(() => {
            renderSubBookmarks(cardIndex, bookmarkIndex);
        }, 0);
    }

    return div;
}

function renderSubBookmarks(cardIndex, bookmarkIndex) {
    const container = document.getElementById(`sub-bookmarks-${cardIndex}-${bookmarkIndex}`);
    if (!container) return;

    container.innerHTML = '';
    const bookmark = bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex];
    const subBookmarks = bookmark.children || [];

    subBookmarks.forEach((subBookmark, subIndex) => {
        // Store the parent bookmark index in a way we can reference
        const subBookmarkEl = createSubBookmarkElement(subBookmark, cardIndex, bookmarkIndex, subIndex);
        container.appendChild(subBookmarkEl);
    });
}

function createSubBookmarkElement(subBookmark, cardIndex, parentIndex, subIndex) {
    const div = document.createElement('div');
    div.className = 'sub-bookmark';

    div.innerHTML = `
        <div class="bookmark-header">
            <span class="bookmark-label">${subBookmark.label || 'Untitled Sub-Bookmark'}</span>
            <div class="bookmark-actions">
                <button class="btn btn-duplicate" onclick="duplicateSubBookmark(${cardIndex}, ${parentIndex}, ${subIndex})">Duplicate</button>
                <button class="btn btn-danger" onclick="deleteSubBookmark(${cardIndex}, ${parentIndex}, ${subIndex})">Delete</button>
            </div>
        </div>

        <div class="form-group">
            <label>ID</label>
            <input type="text" value="${subBookmark.id || ''}" onchange="updateSubBookmarkField(${cardIndex}, ${parentIndex}, ${subIndex}, 'id', this.value)" />
        </div>
        <div class="form-group">
            <label>Label</label>
            <input type="text" value="${subBookmark.label || ''}" onchange="updateSubBookmarkField(${cardIndex}, ${parentIndex}, ${subIndex}, 'label', this.value)" />
        </div>
        <div class="form-group">
            <label>URL</label>
            <input type="text" value="${subBookmark.url || ''}" onchange="updateSubBookmarkField(${cardIndex}, ${parentIndex}, ${subIndex}, 'url', this.value)" />
        </div>
        <div class="form-row-3">
            <div class="form-group">
                <label>Icon Type</label>
                <select onchange="updateSubBookmarkField(${cardIndex}, ${parentIndex}, ${subIndex}, 'iconType', this.value)">
                    ${ICON_TYPES.map(type => `<option value="${type}" ${subBookmark.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Icon</label>
                <input type="text" value="${subBookmark.icon || ''}" onchange="updateSubBookmarkField(${cardIndex}, ${parentIndex}, ${subIndex}, 'icon', this.value)" />
            </div>
        </div>
        <div class="form-group">
            <label>Tags</label>
            <div class="tags-container">
                ${(subBookmark.tags || []).map((tag, tagIndex) => `
                    <span class="tag">
                        ${tag}
                        <button class="tag-remove" onclick="removeSubBookmarkTag(${cardIndex}, ${parentIndex}, ${subIndex}, ${tagIndex})">×</button>
                    </span>
                `).join('')}
                <input type="text" class="tag-input" placeholder="Add tag..." onkeypress="addSubBookmarkTag(event, ${cardIndex}, ${parentIndex}, ${subIndex})" />
            </div>
        </div>
    `;

    return div;
}

// ==================== UPDATE FUNCTIONS ====================

function updateCardField(cardIndex, field, value) {
    bookmarksData.cards[cardIndex][field] = value;

    // Re-render to update the header display and pattern color
    if (field === 'title' || field === 'pattern') {
        renderCards();
    } else {
        validateData();
    }
}

function updateBookmarkField(cardIndex, bookmarkIndex, field, value, isSubBookmark) {
    bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex][field] = value;

    if (field === 'label') {
        renderBookmarks(cardIndex);
    } else {
        validateData();
    }
}

function updateSubBookmarkField(cardIndex, parentIndex, subIndex, field, value) {
    bookmarksData.cards[cardIndex].bookmarks[parentIndex].children[subIndex][field] = value;

    if (field === 'label') {
        renderSubBookmarks(cardIndex, parentIndex);
    } else {
        validateData();
    }
}

// ==================== ADD FUNCTIONS ====================

function addCard() {
    const existingIds = getAllIds();
    const newCard = {
        id: generateUniqueId('new-card', existingIds),
        title: 'New Card',
        description: '',
        pattern: 'slate',
        enabled: true,
        order: bookmarksData.cards.length + 1,
        bookmarks: []
    };

    bookmarksData.cards.push(newCard);
    renderCards();
}

function addBookmark(cardIndex) {
    const existingIds = getAllIds();
    const newBookmark = {
        id: generateUniqueId('new-bookmark', existingIds),
        label: 'New Bookmark',
        url: 'https://',
        iconType: 'emoji',
        icon: '🔗',
        tags: [],
        children: []
    };

    bookmarksData.cards[cardIndex].bookmarks.push(newBookmark);
    renderBookmarks(cardIndex);
    validateData();
}

function addSubBookmark(cardIndex, bookmarkIndex) {
    const existingIds = getAllIds();
    const newSubBookmark = {
        id: generateUniqueId('new-sub-bookmark', existingIds),
        label: 'New Sub-Bookmark',
        url: 'https://',
        iconType: 'emoji',
        icon: '🔗',
        tags: [],
        children: []
    };

    if (!bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex].children) {
        bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex].children = [];
    }

    bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex].children.push(newSubBookmark);
    renderSubBookmarks(cardIndex, bookmarkIndex);
    validateData();
}

// ==================== DELETE FUNCTIONS ====================

function deleteCard(cardIndex) {
    if (confirm('Are you sure you want to delete this card?')) {
        bookmarksData.cards.splice(cardIndex, 1);
        renderCards();
    }
}

function deleteBookmark(cardIndex, bookmarkIndex) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        bookmarksData.cards[cardIndex].bookmarks.splice(bookmarkIndex, 1);
        renderBookmarks(cardIndex);
        validateData();
    }
}

function deleteSubBookmark(cardIndex, parentIndex, subIndex) {
    if (confirm('Are you sure you want to delete this sub-bookmark?')) {
        bookmarksData.cards[cardIndex].bookmarks[parentIndex].children.splice(subIndex, 1);
        renderSubBookmarks(cardIndex, parentIndex);
        validateData();
    }
}

// ==================== DUPLICATE FUNCTIONS ====================

function duplicateCard(cardIndex) {
    const originalCard = bookmarksData.cards[cardIndex];
    const existingIds = getAllIds();

    // Deep clone the card
    const duplicatedCard = JSON.parse(JSON.stringify(originalCard));

    // Generate new unique IDs
    duplicatedCard.id = generateUniqueId(duplicatedCard.title, existingIds);
    duplicatedCard.title = `${duplicatedCard.title} (Copy)`;

    // Update all bookmark IDs
    duplicatedCard.bookmarks.forEach(bookmark => {
        existingIds.push(duplicatedCard.id); // Add card id to prevent conflicts
        bookmark.id = generateUniqueId(bookmark.label, existingIds);
        existingIds.push(bookmark.id);

        if (bookmark.children) {
            bookmark.children.forEach(child => {
                child.id = generateUniqueId(child.label, existingIds);
                existingIds.push(child.id);
            });
        }
    });

    bookmarksData.cards.splice(cardIndex + 1, 0, duplicatedCard);
    renderCards();
}

function duplicateBookmark(cardIndex, bookmarkIndex) {
    const originalBookmark = bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex];
    const existingIds = getAllIds();

    // Deep clone the bookmark
    const duplicatedBookmark = JSON.parse(JSON.stringify(originalBookmark));

    // Generate new unique IDs
    duplicatedBookmark.id = generateUniqueId(duplicatedBookmark.label, existingIds);
    duplicatedBookmark.label = `${duplicatedBookmark.label} (Copy)`;
    existingIds.push(duplicatedBookmark.id);

    if (duplicatedBookmark.children) {
        duplicatedBookmark.children.forEach(child => {
            child.id = generateUniqueId(child.label, existingIds);
            existingIds.push(child.id);
        });
    }

    bookmarksData.cards[cardIndex].bookmarks.splice(bookmarkIndex + 1, 0, duplicatedBookmark);
    renderBookmarks(cardIndex);
    validateData();
}

function duplicateSubBookmark(cardIndex, parentIndex, subIndex) {
    const originalSubBookmark = bookmarksData.cards[cardIndex].bookmarks[parentIndex].children[subIndex];
    const existingIds = getAllIds();

    // Deep clone the sub-bookmark
    const duplicatedSubBookmark = JSON.parse(JSON.stringify(originalSubBookmark));

    // Generate new unique ID
    duplicatedSubBookmark.id = generateUniqueId(duplicatedSubBookmark.label, existingIds);
    duplicatedSubBookmark.label = `${duplicatedSubBookmark.label} (Copy)`;

    bookmarksData.cards[cardIndex].bookmarks[parentIndex].children.splice(subIndex + 1, 0, duplicatedSubBookmark);
    renderSubBookmarks(cardIndex, parentIndex);
    validateData();
}

// ==================== TAG FUNCTIONS ====================

function addTag(event, cardIndex, bookmarkIndex, isSubBookmark) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const tag = input.value.trim();

        if (tag) {
            const bookmark = bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex];
            if (!bookmark.tags) bookmark.tags = [];
            bookmark.tags.push(tag);
            input.value = '';
            renderBookmarks(cardIndex);
            validateData();
        }
    }
}

function removeTag(cardIndex, bookmarkIndex, tagIndex, isSubBookmark) {
    bookmarksData.cards[cardIndex].bookmarks[bookmarkIndex].tags.splice(tagIndex, 1);
    renderBookmarks(cardIndex);
    validateData();
}

function addSubBookmarkTag(event, cardIndex, parentIndex, subIndex) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = event.target;
        const tag = input.value.trim();

        if (tag) {
            const subBookmark = bookmarksData.cards[cardIndex].bookmarks[parentIndex].children[subIndex];
            if (!subBookmark.tags) subBookmark.tags = [];
            subBookmark.tags.push(tag);
            input.value = '';
            renderSubBookmarks(cardIndex, parentIndex);
            validateData();
        }
    }
}

function removeSubBookmarkTag(cardIndex, parentIndex, subIndex, tagIndex) {
    bookmarksData.cards[cardIndex].bookmarks[parentIndex].children[subIndex].tags.splice(tagIndex, 1);
    renderSubBookmarks(cardIndex, parentIndex);
    validateData();
}

// ==================== SAVE/EXPORT FUNCTIONS ====================

function downloadJSON() {
    if (!validateData()) {
        alert('Please fix all errors before downloading.');
        return;
    }

    const dataStr = JSON.stringify(bookmarksData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmarks.json';
    link.click();
    URL.revokeObjectURL(url);

    showSuccessMessage('JSON downloaded successfully!');
}

function copyToClipboard() {
    if (!validateData()) {
        alert('Please fix all errors before copying.');
        return;
    }

    const dataStr = JSON.stringify(bookmarksData, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
        showSuccessMessage('JSON copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy to clipboard: ' + err);
    });
}

function showSuccessMessage(message) {
    const successMsg = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    successText.textContent = message;
    successMsg.style.display = 'block';

    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);
}

// ==================== LOAD JSON FUNCTIONS ====================

let pendingFileData = null;

function loadJSON() {
    document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate structure
            if (!data.cards || !Array.isArray(data.cards)) {
                alert('Invalid JSON structure: missing or invalid "cards" array');
                return;
            }

            // Store pending data and show confirmation
            pendingFileData = data;
            document.getElementById('confirmDialog').style.display = 'flex';
        } catch (err) {
            alert('Invalid JSON file: ' + err.message);
        }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

function confirmLoad() {
    if (pendingFileData) {
        bookmarksData = pendingFileData;
        pendingFileData = null;
        document.getElementById('confirmDialog').style.display = 'none';
        renderCards();
        showSuccessMessage('JSON loaded successfully!');
    }
}

function cancelLoad() {
    pendingFileData = null;
    document.getElementById('confirmDialog').style.display = 'none';
}

// ==================== SEARCH/FILTER FUNCTIONS ====================

function handleSearch(query) {
    const searchQuery = query.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchQuery === '') {
        clearBtn.style.display = 'none';
        // Show all cards
        document.querySelectorAll('.card').forEach(card => {
            card.style.display = 'block';
        });
        return;
    }

    clearBtn.style.display = 'block';

    // Filter cards
    bookmarksData.cards.forEach((card, cardIndex) => {
        const cardEl = document.querySelector(`[data-card-index="${cardIndex}"]`);
        if (!cardEl) return;

        let matches = false;

        // Check card title and description
        if (card.title?.toLowerCase().includes(searchQuery) ||
            card.description?.toLowerCase().includes(searchQuery)) {
            matches = true;
        }

        // Check bookmarks
        card.bookmarks?.forEach(bookmark => {
            if (bookmark.label?.toLowerCase().includes(searchQuery) ||
                bookmark.url?.toLowerCase().includes(searchQuery) ||
                bookmark.tags?.some(tag => tag.toLowerCase().includes(searchQuery))) {
                matches = true;
            }

            // Check sub-bookmarks
            bookmark.children?.forEach(child => {
                if (child.label?.toLowerCase().includes(searchQuery) ||
                    child.url?.toLowerCase().includes(searchQuery) ||
                    child.tags?.some(tag => tag.toLowerCase().includes(searchQuery))) {
                    matches = true;
                }
            });
        });

        // Show/hide card and expand if matches
        if (matches) {
            cardEl.style.display = 'block';
            cardEl.classList.add('expanded');
        } else {
            cardEl.style.display = 'none';
        }
    });
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    handleSearch('');
}

// ==================== INITIALIZATION ====================

async function init() {
    try {
        // Load bookmarks.json
        const response = await fetch('../assets/data/bookmarks.json');
        if (!response.ok) {
            throw new Error('Failed to load bookmarks.json');
        }

        bookmarksData = await response.json();
        renderCards();

        // Event listeners
        document.getElementById('addCardBtn').addEventListener('click', addCard);
        document.getElementById('downloadJsonBtn').addEventListener('click', downloadJSON);
        document.getElementById('copyToClipboardBtn').addEventListener('click', copyToClipboard);
        document.getElementById('loadJsonBtn').addEventListener('click', loadJSON);
        document.getElementById('fileInput').addEventListener('change', handleFileSelect);
        document.getElementById('confirmLoadBtn').addEventListener('click', confirmLoad);
        document.getElementById('cancelLoadBtn').addEventListener('click', cancelLoad);
        document.getElementById('searchInput').addEventListener('input', (e) => handleSearch(e.target.value));
        document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);

    } catch (error) {
        alert('Error loading bookmarks: ' + error.message);
        console.error(error);
    }
}

// Start the application
init();
