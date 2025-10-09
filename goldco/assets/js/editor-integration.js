// ==================== EDITOR INTEGRATION FOR FLIP CARDS ====================

// State Management
let editorState = {
    currentCardIndex: null,
    workingCopy: null,
    validationErrors: [],
    isNewCard: false
};

// Constants
const VALID_PATTERNS = ['sky', 'pink', 'purple', 'indigo', 'green', 'slate', 'orange', 'zinc', 'brown'];
const ICON_TYPES = ['emoji', 'local', 'url'];

// ==================== INITIALIZATION ====================

// Wait for main.js to load bookmarksData, then initialize editor
document.addEventListener('DOMContentLoaded', () => {
    // Wait for bookmarksData to be loaded
    const checkDataLoaded = setInterval(() => {
        if (typeof bookmarksData !== 'undefined' && bookmarksData !== null) {
            clearInterval(checkDataLoaded);
            initializeEditor();
        }
    }, 100);
});

function initializeEditor() {
    console.log('✅ Editor integration initialized');

    // Add gear icons to all cards
    addGearIconsToCards();

    // Setup "Add Card" button listener
    const addCardBtn = document.getElementById('addCardBtn');
    if (addCardBtn) {
        addCardBtn.addEventListener('click', handleAddCard);
    }

    // Setup modal event listeners
    setupModalEventListeners();
}

// ==================== GEAR ICON INJECTION ====================

function addGearIconsToCards() {
    // Wait for cards to be rendered
    setTimeout(() => {
        const cardBacks = document.querySelectorAll('.flip .back');
        cardBacks.forEach((cardBack, index) => {
            // Check if gear icon already exists
            if (cardBack.querySelector('.card-edit-btn')) return;

            // Create gear button
            const gearBtn = document.createElement('button');
            gearBtn.className = 'card-edit-btn';
            gearBtn.innerHTML = '⚙️';
            gearBtn.setAttribute('aria-label', 'Edit Card');
            gearBtn.dataset.cardIndex = index;

            // Add click event
            gearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditorModal(index);
            });

            cardBack.appendChild(gearBtn);
        });
    }, 500);
}

// Re-add gear icons after cards are re-rendered
function reAddGearIcons() {
    setTimeout(() => {
        addGearIconsToCards();
    }, 100);
}

// ==================== MODAL MANAGEMENT ====================

function setupModalEventListeners() {
    const overlay = document.getElementById('editorModalOverlay');
    const closeBtn = document.querySelector('.editor-modal-close');

    // Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleDiscardChanges();
            }
        });
    }

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('editorModalContainer');
            if (modal && modal.classList.contains('active')) {
                handleDiscardChanges();
            }
        }
    });
}

function openEditorModal(cardIndex) {
    editorState.currentCardIndex = cardIndex;
    editorState.isNewCard = false;

    // Create working copy
    editorState.workingCopy = JSON.parse(JSON.stringify(bookmarksData.cards[cardIndex]));

    // Render modal content
    renderEditorModal();

    // Show modal
    showModal();
}

function handleAddCard() {
    // Generate new card with defaults
    const existingIds = getAllIds();
    const newCardOrder = bookmarksData.cards.length + 1;

    const newCard = {
        id: generateUniqueId('new-card', existingIds),
        title: 'New Card',
        description: 'Card • Description • Here',
        pattern: 'slate',
        enabled: true,
        order: newCardOrder,
        bookmarks: []
    };

    editorState.currentCardIndex = bookmarksData.cards.length;
    editorState.isNewCard = true;
    editorState.workingCopy = newCard;

    // Render modal content
    renderEditorModal();

    // Show modal
    showModal();

    // Close settings panel
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');

    if (hamburgerMenu) hamburgerMenu.classList.remove('active');
    if (settingsPanel) settingsPanel.classList.remove('active');
    if (settingsOverlay) settingsOverlay.classList.remove('active');
}

function showModal() {
    const overlay = document.getElementById('editorModalOverlay');
    const container = document.getElementById('editorModalContainer');

    if (overlay) overlay.classList.add('active');
    if (container) container.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('editorModalOverlay');
    const container = document.getElementById('editorModalContainer');

    if (overlay) overlay.classList.remove('active');
    if (container) container.classList.remove('active');

    // Reset state
    editorState.currentCardIndex = null;
    editorState.workingCopy = null;
    editorState.validationErrors = [];
    editorState.isNewCard = false;
}

// ==================== MODAL RENDERING ====================

function renderEditorModal() {
    const container = document.getElementById('editorModalContent');
    if (!container) return;

    const card = editorState.workingCopy;

    const html = `
        <div class="editor-modal-header" data-pattern="${card.pattern}">
            <h2>${editorState.isNewCard ? 'Create New Card' : 'Edit Card'}</h2>
            <p>${card.title}</p>
            <button class="editor-modal-close" onclick="handleDiscardChanges()">×</button>
        </div>

        <div class="editor-modal-body">
            <!-- Error Summary -->
            <div id="editorErrorSummary" class="editor-error-summary" style="display: none;">
                <div class="editor-error-summary-header">
                    <span id="editorErrorCount">0</span> errors found - fix them to save
                </div>
                <ul id="editorErrorList"></ul>
            </div>

            <!-- Card Details Section -->
            <div class="editor-section">
                <div class="editor-section-title">Card Details</div>

                <div class="editor-form-group">
                    <label>Card ID</label>
                    <input type="text" id="cardId" value="${card.id}" onchange="updateCardField('id', this.value)" />
                </div>

                <div class="editor-form-group">
                    <label>Card Title</label>
                    <input type="text" id="cardTitle" value="${card.title}" onchange="updateCardField('title', this.value)" />
                </div>

                <div class="editor-form-group">
                    <label>Card Description</label>
                    <textarea id="cardDescription" onchange="updateCardField('description', this.value)">${card.description}</textarea>
                </div>

                <div class="editor-form-row">
                    <div class="editor-form-group">
                        <label>Pattern</label>
                        <select id="cardPattern" onchange="updateCardField('pattern', this.value)">
                            ${VALID_PATTERNS.map(p => `<option value="${p}" ${card.pattern === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
                        </select>
                    </div>

                    <div class="editor-form-group">
                        <label>Order</label>
                        <input type="number" id="cardOrder" value="${card.order}" onchange="updateCardField('order', parseInt(this.value))" />
                    </div>
                </div>

                <div class="editor-form-group">
                    <div class="editor-checkbox-group">
                        <input type="checkbox" id="cardEnabled" ${card.enabled ? 'checked' : ''} onchange="updateCardField('enabled', this.checked)" />
                        <label for="cardEnabled">Enabled (visible on dashboard)</label>
                    </div>
                </div>
            </div>

            <!-- Bookmarks Section -->
            <div class="editor-section">
                <div class="editor-section-title">Bookmarks</div>
                <div id="editorBookmarksContainer" class="editor-bookmarks-container">
                    ${renderBookmarks()}
                </div>
                <button class="editor-add-item-btn" onclick="addBookmark()">+ Add Bookmark</button>
            </div>
        </div>

        <div class="editor-modal-footer">
            <button class="editor-btn editor-btn-secondary" onclick="handleDiscardChanges()">Discard Changes</button>
            <button class="editor-btn editor-btn-primary" id="saveChangesBtn" onclick="handleSaveChanges()">Save Changes</button>
        </div>
    `;

    container.innerHTML = html;

    // Run initial validation
    validateWorkingCopy();
}

function renderBookmarks() {
    const bookmarks = editorState.workingCopy.bookmarks || [];

    if (bookmarks.length === 0) {
        return '<p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">No bookmarks yet. Click "Add Bookmark" to get started.</p>';
    }

    return bookmarks.map((bookmark, index) => `
        <div class="editor-bookmark ${bookmark._hasError ? 'has-error' : ''}" data-bookmark-index="${index}">
            <div class="editor-bookmark-header">
                <span class="editor-bookmark-label">${bookmark.label || 'Untitled Bookmark'}</span>
                <div class="editor-bookmark-actions">
                    <button class="editor-btn editor-btn-duplicate" onclick="duplicateBookmark(${index})">Duplicate</button>
                    <button class="editor-btn editor-btn-danger" onclick="deleteBookmark(${index})">Delete</button>
                </div>
            </div>

            <div class="editor-form-group">
                <label>ID</label>
                <input type="text" value="${bookmark.id || ''}" onchange="updateBookmarkField(${index}, 'id', this.value)" />
            </div>

            <div class="editor-form-group">
                <label>Label</label>
                <input type="text" value="${bookmark.label || ''}" onchange="updateBookmarkField(${index}, 'label', this.value)" />
            </div>

            <div class="editor-form-group">
                <label>URL</label>
                <input type="text" value="${bookmark.url || ''}" onchange="updateBookmarkField(${index}, 'url', this.value)" />
            </div>

            <div class="editor-form-row-3">
                <div class="editor-form-group">
                    <label>Icon Type</label>
                    <select onchange="updateBookmarkField(${index}, 'iconType', this.value)">
                        ${ICON_TYPES.map(type => `<option value="${type}" ${bookmark.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>

                <div class="editor-form-group" style="grid-column: span 2;">
                    <label>Icon</label>
                    <input type="text" value="${bookmark.icon || ''}" onchange="updateBookmarkField(${index}, 'icon', this.value)" />
                </div>
            </div>

            <div class="editor-form-group">
                <label>Tags</label>
                <div class="editor-tags-container">
                    ${(bookmark.tags || []).map((tag, tagIndex) => `
                        <span class="editor-tag">
                            ${tag}
                            <button class="editor-tag-remove" onclick="removeBookmarkTag(${index}, ${tagIndex})">×</button>
                        </span>
                    `).join('')}
                    <input type="text" class="editor-tag-input" placeholder="Add tag..." onkeypress="addBookmarkTag(event, ${index})" />
                </div>
            </div>

            ${renderSubBookmarks(bookmark, index)}
        </div>
    `).join('');
}

function renderSubBookmarks(bookmark, bookmarkIndex) {
    const children = bookmark.children || [];

    if (children.length === 0) {
        return `
            <div class="editor-sub-bookmarks-container">
                <button class="editor-add-item-btn" onclick="addSubBookmark(${bookmarkIndex})">+ Add Sub-Bookmark</button>
            </div>
        `;
    }

    return `
        <div class="editor-sub-bookmarks-container">
            ${children.map((child, childIndex) => `
                <div class="editor-sub-bookmark ${child._hasError ? 'has-error' : ''}">
                    <div class="editor-bookmark-header">
                        <span class="editor-bookmark-label">${child.label || 'Untitled Sub-Bookmark'}</span>
                        <div class="editor-bookmark-actions">
                            <button class="editor-btn editor-btn-duplicate" onclick="duplicateSubBookmark(${bookmarkIndex}, ${childIndex})">Duplicate</button>
                            <button class="editor-btn editor-btn-danger" onclick="deleteSubBookmark(${bookmarkIndex}, ${childIndex})">Delete</button>
                        </div>
                    </div>

                    <div class="editor-form-group">
                        <label>ID</label>
                        <input type="text" value="${child.id || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${childIndex}, 'id', this.value)" />
                    </div>

                    <div class="editor-form-group">
                        <label>Label</label>
                        <input type="text" value="${child.label || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${childIndex}, 'label', this.value)" />
                    </div>

                    <div class="editor-form-group">
                        <label>URL</label>
                        <input type="text" value="${child.url || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${childIndex}, 'url', this.value)" />
                    </div>

                    <div class="editor-form-row-3">
                        <div class="editor-form-group">
                            <label>Icon Type</label>
                            <select onchange="updateSubBookmarkField(${bookmarkIndex}, ${childIndex}, 'iconType', this.value)">
                                ${ICON_TYPES.map(type => `<option value="${type}" ${child.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                            </select>
                        </div>

                        <div class="editor-form-group" style="grid-column: span 2;">
                            <label>Icon</label>
                            <input type="text" value="${child.icon || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${childIndex}, 'icon', this.value)" />
                        </div>
                    </div>

                    <div class="editor-form-group">
                        <label>Tags</label>
                        <div class="editor-tags-container">
                            ${(child.tags || []).map((tag, tagIndex) => `
                                <span class="editor-tag">
                                    ${tag}
                                    <button class="editor-tag-remove" onclick="removeSubBookmarkTag(${bookmarkIndex}, ${childIndex}, ${tagIndex})">×</button>
                                </span>
                            `).join('')}
                            <input type="text" class="editor-tag-input" placeholder="Add tag..." onkeypress="addSubBookmarkTag(event, ${bookmarkIndex}, ${childIndex})" />
                        </div>
                    </div>
                </div>
            `).join('')}
            <button class="editor-add-item-btn" onclick="addSubBookmark(${bookmarkIndex})">+ Add Sub-Bookmark</button>
        </div>
    `;
}

// ==================== UPDATE FUNCTIONS ====================

function updateCardField(field, value) {
    editorState.workingCopy[field] = value;

    // Update modal header if title or pattern changed
    if (field === 'title' || field === 'pattern') {
        const header = document.querySelector('.editor-modal-header');
        if (header && field === 'pattern') {
            header.setAttribute('data-pattern', value);
        }
        if (header && field === 'title') {
            const titleEl = header.querySelector('p');
            if (titleEl) titleEl.textContent = value;
        }
    }

    validateWorkingCopy();
}

function updateBookmarkField(bookmarkIndex, field, value) {
    editorState.workingCopy.bookmarks[bookmarkIndex][field] = value;

    if (field === 'label') {
        // Update the label display
        const labelEl = document.querySelector(`[data-bookmark-index="${bookmarkIndex}"] .editor-bookmark-label`);
        if (labelEl) labelEl.textContent = value || 'Untitled Bookmark';
    }

    validateWorkingCopy();
}

function updateSubBookmarkField(bookmarkIndex, childIndex, field, value) {
    editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex][field] = value;
    validateWorkingCopy();
}

// ==================== ADD FUNCTIONS ====================

function addBookmark() {
    const existingIds = getAllIdsFromWorkingCopy();
    const newBookmark = {
        id: generateUniqueId('new-bookmark', existingIds),
        label: 'New Bookmark',
        url: 'https://',
        iconType: 'emoji',
        icon: '🔗',
        tags: [],
        children: []
    };

    editorState.workingCopy.bookmarks.push(newBookmark);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

function addSubBookmark(bookmarkIndex) {
    const existingIds = getAllIdsFromWorkingCopy();
    const newSubBookmark = {
        id: generateUniqueId('new-sub-bookmark', existingIds),
        label: 'New Sub-Bookmark',
        url: 'https://',
        iconType: 'emoji',
        icon: '🔗',
        tags: [],
        children: []
    };

    if (!editorState.workingCopy.bookmarks[bookmarkIndex].children) {
        editorState.workingCopy.bookmarks[bookmarkIndex].children = [];
    }

    editorState.workingCopy.bookmarks[bookmarkIndex].children.push(newSubBookmark);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

// ==================== DELETE FUNCTIONS ====================

function deleteBookmark(bookmarkIndex) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        editorState.workingCopy.bookmarks.splice(bookmarkIndex, 1);
        reRenderBookmarksSection();
        validateWorkingCopy();
    }
}

function deleteSubBookmark(bookmarkIndex, childIndex) {
    if (confirm('Are you sure you want to delete this sub-bookmark?')) {
        editorState.workingCopy.bookmarks[bookmarkIndex].children.splice(childIndex, 1);
        reRenderBookmarksSection();
        validateWorkingCopy();
    }
}

// ==================== DUPLICATE FUNCTIONS ====================

function duplicateBookmark(bookmarkIndex) {
    const original = editorState.workingCopy.bookmarks[bookmarkIndex];
    const existingIds = getAllIdsFromWorkingCopy();

    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = generateUniqueId(duplicate.label, existingIds);
    duplicate.label = `${duplicate.label} (Copy)`;

    // Update child IDs
    if (duplicate.children) {
        existingIds.push(duplicate.id);
        duplicate.children.forEach(child => {
            child.id = generateUniqueId(child.label, existingIds);
            existingIds.push(child.id);
        });
    }

    editorState.workingCopy.bookmarks.splice(bookmarkIndex + 1, 0, duplicate);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

function duplicateSubBookmark(bookmarkIndex, childIndex) {
    const original = editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex];
    const existingIds = getAllIdsFromWorkingCopy();

    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = generateUniqueId(duplicate.label, existingIds);
    duplicate.label = `${duplicate.label} (Copy)`;

    editorState.workingCopy.bookmarks[bookmarkIndex].children.splice(childIndex + 1, 0, duplicate);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

// ==================== TAG FUNCTIONS ====================

function addBookmarkTag(event, bookmarkIndex) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tag = event.target.value.trim();

        if (tag) {
            if (!editorState.workingCopy.bookmarks[bookmarkIndex].tags) {
                editorState.workingCopy.bookmarks[bookmarkIndex].tags = [];
            }
            editorState.workingCopy.bookmarks[bookmarkIndex].tags.push(tag);
            event.target.value = '';
            reRenderBookmarksSection();
            validateWorkingCopy();
        }
    }
}

function removeBookmarkTag(bookmarkIndex, tagIndex) {
    editorState.workingCopy.bookmarks[bookmarkIndex].tags.splice(tagIndex, 1);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

function addSubBookmarkTag(event, bookmarkIndex, childIndex) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const tag = event.target.value.trim();

        if (tag) {
            if (!editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex].tags) {
                editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex].tags = [];
            }
            editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex].tags.push(tag);
            event.target.value = '';
            reRenderBookmarksSection();
            validateWorkingCopy();
        }
    }
}

function removeSubBookmarkTag(bookmarkIndex, childIndex, tagIndex) {
    editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex].tags.splice(tagIndex, 1);
    reRenderBookmarksSection();
    validateWorkingCopy();
}

// ==================== UTILITY FUNCTIONS ====================

function reRenderBookmarksSection() {
    const container = document.getElementById('editorBookmarksContainer');
    if (container) {
        container.innerHTML = renderBookmarks();
    }
}

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function generateUniqueId(label, existingIds) {
    let baseId = slugify(label);
    let finalId = baseId;
    let counter = 2;

    while (existingIds.includes(finalId)) {
        finalId = `${baseId}-${counter}`;
        counter++;
    }

    return finalId;
}

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

function getAllIdsFromWorkingCopy() {
    const ids = [];

    // Add all existing card IDs except current one
    bookmarksData.cards.forEach((card, index) => {
        if (index !== editorState.currentCardIndex) {
            ids.push(card.id);
            card.bookmarks.forEach(bookmark => {
                ids.push(bookmark.id);
                if (bookmark.children) {
                    bookmark.children.forEach(child => {
                        ids.push(child.id);
                    });
                }
            });
        }
    });

    // Add IDs from working copy
    ids.push(editorState.workingCopy.id);
    editorState.workingCopy.bookmarks.forEach(bookmark => {
        ids.push(bookmark.id);
        if (bookmark.children) {
            bookmark.children.forEach(child => {
                ids.push(child.id);
            });
        }
    });

    return ids;
}

// ==================== VALIDATION ====================

function validateWorkingCopy() {
    editorState.validationErrors = [];
    const allIds = [];
    const card = editorState.workingCopy;

    // Validate card
    if (!card.id || card.id.trim() === '') {
        editorState.validationErrors.push('Card: Missing required field "id"');
    }
    if (!card.title || card.title.trim() === '') {
        editorState.validationErrors.push('Card: Missing required field "title"');
    }

    // Check for duplicate card ID in other cards
    bookmarksData.cards.forEach((existingCard, index) => {
        if (index !== editorState.currentCardIndex && existingCard.id === card.id) {
            editorState.validationErrors.push(`Card: Duplicate ID "${card.id}" - already used by another card`);
        }
    });

    if (card.id) allIds.push(card.id);

    // Validate pattern
    if (card.pattern && !VALID_PATTERNS.includes(card.pattern)) {
        editorState.validationErrors.push(`Card: Invalid pattern "${card.pattern}"`);
    }

    // Validate bookmarks
    if (card.bookmarks) {
        card.bookmarks.forEach((bookmark, bookmarkIndex) => {
            validateBookmark(bookmark, `Bookmark ${bookmarkIndex + 1}`, allIds, bookmarkIndex);

            // Validate sub-bookmarks
            if (bookmark.children) {
                bookmark.children.forEach((child, childIndex) => {
                    validateBookmark(child, `Bookmark ${bookmarkIndex + 1} → Sub-bookmark ${childIndex + 1}`, allIds, bookmarkIndex, childIndex);
                });
            }
        });
    }

    updateValidationDisplay();
    return editorState.validationErrors.length === 0;
}

function validateBookmark(bookmark, path, allIds, bookmarkIndex, childIndex) {
    // Check required fields
    if (!bookmark.id || bookmark.id.trim() === '') {
        editorState.validationErrors.push(`${path}: Missing required field "id"`);
    }
    if (!bookmark.label || bookmark.label.trim() === '') {
        editorState.validationErrors.push(`${path}: Missing required field "label"`);
    }
    if (!bookmark.url || bookmark.url.trim() === '') {
        editorState.validationErrors.push(`${path}: Missing required field "url"`);
    }

    // Check for duplicate IDs
    if (bookmark.id) {
        // Check against all IDs in the system
        const allSystemIds = getAllIds();
        const isDuplicateInSystem = allSystemIds.filter((id, index, arr) => {
            // Exclude the current card being edited
            return id === bookmark.id;
        }).length > 0;

        // Also check within working copy
        if (allIds.includes(bookmark.id)) {
            editorState.validationErrors.push(`${path}: Duplicate ID "${bookmark.id}"`);
        } else {
            allIds.push(bookmark.id);
        }
    }

    // Validate URL format (allow # for parent bookmarks with children)
    if (bookmark.url && bookmark.url !== '#' && !bookmark.url.startsWith('http://') && !bookmark.url.startsWith('https://')) {
        editorState.validationErrors.push(`${path}: URL must start with http:// or https:// (or use # for parent bookmarks)`);
    }
}

function updateValidationDisplay() {
    const errorSummary = document.getElementById('editorErrorSummary');
    const errorCount = document.getElementById('editorErrorCount');
    const errorList = document.getElementById('editorErrorList');
    const saveBtn = document.getElementById('saveChangesBtn');

    if (!errorSummary || !errorCount || !errorList || !saveBtn) return;

    if (editorState.validationErrors.length > 0) {
        errorSummary.style.display = 'block';
        errorCount.textContent = editorState.validationErrors.length;
        errorList.innerHTML = editorState.validationErrors.map(err => `<li>${err}</li>`).join('');
        saveBtn.disabled = true;
    } else {
        errorSummary.style.display = 'none';
        saveBtn.disabled = false;
    }
}

// ==================== SAVE/DISCARD ====================

function handleSaveChanges() {
    // Validate before saving
    if (!validateWorkingCopy()) {
        alert('Please fix all errors before saving.');
        return;
    }

    // Update bookmarksData
    if (editorState.isNewCard) {
        // Add new card
        bookmarksData.cards.push(editorState.workingCopy);
    } else {
        // Update existing card
        bookmarksData.cards[editorState.currentCardIndex] = editorState.workingCopy;
    }

    // Re-render all cards
    renderAllCards();

    // Re-add gear icons
    reAddGearIcons();

    // Re-initialize modal triggers
    initializeModalTriggers();

    // Trigger JSON download
    downloadUpdatedJSON();

    // Show success message
    showSuccessMessage('Changes saved! JSON file downloaded.');
}

function handleDiscardChanges() {
    if (confirm('Discard all changes? This cannot be undone.')) {
        closeModal();
    }
}

function downloadUpdatedJSON() {
    const dataStr = JSON.stringify(bookmarksData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmarks.json';
    link.click();
    URL.revokeObjectURL(url);
}

function showSuccessMessage(message) {
    // Create success message element if it doesn't exist
    let successMsg = document.getElementById('editorSuccessMessage');
    if (!successMsg) {
        successMsg = document.createElement('div');
        successMsg.id = 'editorSuccessMessage';
        successMsg.className = 'editor-success-message';
        document.body.appendChild(successMsg);
    }

    successMsg.textContent = message;
    successMsg.classList.add('active');

    setTimeout(() => {
        successMsg.classList.remove('active');
    }, 3000);
}

// ==================== GLOBAL SCOPE FUNCTIONS ====================
// These need to be global for onclick handlers

window.updateCardField = updateCardField;
window.updateBookmarkField = updateBookmarkField;
window.updateSubBookmarkField = updateSubBookmarkField;
window.addBookmark = addBookmark;
window.addSubBookmark = addSubBookmark;
window.deleteBookmark = deleteBookmark;
window.deleteSubBookmark = deleteSubBookmark;
window.duplicateBookmark = duplicateBookmark;
window.duplicateSubBookmark = duplicateSubBookmark;
window.addBookmarkTag = addBookmarkTag;
window.removeBookmarkTag = removeBookmarkTag;
window.addSubBookmarkTag = addSubBookmarkTag;
window.removeSubBookmarkTag = removeSubBookmarkTag;
window.handleSaveChanges = handleSaveChanges;
window.handleDiscardChanges = handleDiscardChanges;
