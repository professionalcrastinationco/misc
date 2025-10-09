// ==================== EDITOR INTEGRATION V2 - SPLIT-SCREEN WITH LIVE PREVIEW ====================

// ==================== STATE MANAGEMENT ====================
let editorState = {
    currentCardIndex: null,
    workingCopy: null,
    selectedBookmarkIndex: null,
    selectedSubBookmarkIndex: null,
    validationErrors: [],
    isNewCard: false,
    editorMode: 'card' // 'card' | 'bookmark' | 'subbookmark'
};

// ==================== CONSTANTS ====================
const VALID_PATTERNS = ['sky', 'pink', 'purple', 'indigo', 'green', 'slate', 'orange', 'zinc', 'brown'];
const ICON_TYPES = ['emoji', 'local', 'url'];

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    const checkDataLoaded = setInterval(() => {
        if (typeof bookmarksData !== 'undefined' && bookmarksData !== null) {
            clearInterval(checkDataLoaded);
            initializeEditorV2();
        }
    }, 100);
});

function initializeEditorV2() {
    console.log('✅ Editor V2 integration initialized');

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
    setTimeout(() => {
        const cardBacks = document.querySelectorAll('.flip .back');
        cardBacks.forEach((cardBack, index) => {
            if (cardBack.querySelector('.card-edit-btn')) return;

            const gearBtn = document.createElement('button');
            gearBtn.className = 'card-edit-btn';
            gearBtn.innerHTML = '⚙️';
            gearBtn.setAttribute('aria-label', 'Edit Card');
            gearBtn.dataset.cardIndex = index;

            gearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditorModal(index);
            });

            cardBack.appendChild(gearBtn);
        });
    }, 500);
}

function reAddGearIcons() {
    setTimeout(() => {
        addGearIconsToCards();
    }, 100);
}

// ==================== MODAL MANAGEMENT ====================

function setupModalEventListeners() {
    const overlay = document.getElementById('editorModalOverlay');

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleDiscardChanges();
            }
        });
    }

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
    editorState.selectedBookmarkIndex = null;
    editorState.selectedSubBookmarkIndex = null;
    editorState.editorMode = 'card';

    // Create working copy
    editorState.workingCopy = JSON.parse(JSON.stringify(bookmarksData.cards[cardIndex]));

    // Render modal content
    renderEditorModal();

    // Show modal
    showModal();
}

function handleAddCard() {
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
    editorState.selectedBookmarkIndex = null;
    editorState.selectedSubBookmarkIndex = null;
    editorState.editorMode = 'card';
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
    editorState.selectedBookmarkIndex = null;
    editorState.selectedSubBookmarkIndex = null;
    editorState.validationErrors = [];
    editorState.isNewCard = false;
    editorState.editorMode = 'card';
}

// ==================== MAIN MODAL RENDERING ====================

function renderEditorModal() {
    const container = document.getElementById('editorModalContent');
    if (!container) return;

    const card = editorState.workingCopy;

    const html = `
        <div class="editor-modal-header-v2" data-pattern="${card.pattern}">
            <h2>${editorState.isNewCard ? 'Create New Card' : 'Edit Card'}: ${card.title}</h2>
            <button class="editor-modal-close-v2" onclick="handleDiscardChanges()">×</button>
        </div>

        <div class="editor-modal-body-v2">
            <!-- Left Panel: Live Preview -->
            <div class="editor-preview-panel" id="editorPreviewPanel">
                ${renderPreviewPanel()}
            </div>

            <!-- Right Panel: Context-Aware Editor -->
            <div class="editor-edit-panel" id="editorEditPanel">
                ${renderBreadcrumb()}
                ${renderQuickActions()}
                ${renderEditorPanel()}
            </div>
        </div>

        <div class="editor-modal-footer-v2">
            <div class="editor-footer-left">
                <button class="editor-btn-v2 editor-btn-secondary-v2" onclick="handleDiscardChanges()">Discard Changes</button>
            </div>
            <div class="editor-footer-center" id="editorFooterCenter">
                ${renderFooterStatus()}
            </div>
            <div class="editor-footer-right">
                <button class="editor-btn-v2 editor-btn-primary-v2" id="saveChangesBtn" onclick="handleSaveChanges()">
                    Save & Download JSON
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Run initial validation
    validateWorkingCopy();
}

// ==================== PREVIEW PANEL RENDERING ====================

function renderPreviewPanel() {
    const card = editorState.workingCopy;

    return `
        <div class="editor-preview-title">LIVE PREVIEW</div>

        <button class="editor-edit-card-btn ${editorState.editorMode === 'card' ? 'active' : ''}" onclick="selectCardSettings()">
            ⚙️ Edit Card Settings
        </button>

        <div class="editor-preview-card">
            ${renderPreviewBookmarks()}
        </div>

        <button class="editor-add-bookmark-preview" onclick="addBookmark()">
            + Add Bookmark
        </button>
    `;
}

function renderPreviewBookmarks() {
    const bookmarks = editorState.workingCopy.bookmarks || [];

    if (bookmarks.length === 0) {
        return '<p style="color: #6b7280; font-style: italic; text-align: center; padding: 20px;">No bookmarks yet. Click "Add Bookmark" to get started.</p>';
    }

    return bookmarks.map((bookmark, index) => {
        const isSelected = editorState.editorMode === 'bookmark' && editorState.selectedBookmarkIndex === index;
        const hasChildren = bookmark.children && bookmark.children.length > 0;

        return `
            <div class="preview-bookmark ${isSelected ? 'selected' : ''}" onclick="selectBookmark(${index})">
                <div class="preview-bookmark-icon">
                    ${renderPreviewIcon(bookmark)}
                </div>
                <div class="preview-bookmark-label">${bookmark.label || 'Untitled Bookmark'}</div>
                ${hasChildren ? `<span class="preview-bookmark-expand" onclick="event.stopPropagation(); toggleSubBookmarks(${index})">▼ ${bookmark.children.length}</span>` : ''}
            </div>
            ${hasChildren ? renderPreviewSubBookmarks(bookmark, index) : ''}
        `;
    }).join('');
}

function renderPreviewSubBookmarks(bookmark, bookmarkIndex) {
    const children = bookmark.children || [];

    return `
        <div class="preview-sub-bookmarks" id="subBookmarks-${bookmarkIndex}">
            ${children.map((child, childIndex) => {
                const isSelected = editorState.editorMode === 'subbookmark' &&
                                   editorState.selectedBookmarkIndex === bookmarkIndex &&
                                   editorState.selectedSubBookmarkIndex === childIndex;

                return `
                    <div class="preview-sub-bookmark ${isSelected ? 'selected' : ''}" onclick="selectSubBookmark(${bookmarkIndex}, ${childIndex})">
                        <div class="preview-bookmark-icon">
                            ${renderPreviewIcon(child)}
                        </div>
                        <div class="preview-bookmark-label">${child.label || 'Untitled Sub-Bookmark'}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderPreviewIcon(item) {
    if (item.iconType === 'emoji') {
        return item.icon || '🔗';
    } else if (item.iconType === 'local') {
        return `<img src="assets/icons_logos/${item.icon}" alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='🔗';" />`;
    } else if (item.iconType === 'url') {
        return `<img src="${item.icon}" alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='🔗';" />`;
    }
    return '🔗';
}

// ==================== BREADCRUMB NAVIGATION ====================

function renderBreadcrumb() {
    let breadcrumbHTML = '<div class="editor-breadcrumb">';

    breadcrumbHTML += `<span class="editor-breadcrumb-item ${editorState.editorMode === 'card' ? 'active' : ''}" onclick="selectCardSettings()">Card: ${editorState.workingCopy.title}</span>`;

    if (editorState.editorMode === 'bookmark' || editorState.editorMode === 'subbookmark') {
        const bookmark = editorState.workingCopy.bookmarks[editorState.selectedBookmarkIndex];
        breadcrumbHTML += '<span class="editor-breadcrumb-separator">→</span>';
        breadcrumbHTML += `<span class="editor-breadcrumb-item ${editorState.editorMode === 'bookmark' ? 'active' : ''}" onclick="selectBookmark(${editorState.selectedBookmarkIndex})">${bookmark.label || 'Untitled Bookmark'}</span>`;
    }

    if (editorState.editorMode === 'subbookmark') {
        const subBookmark = editorState.workingCopy.bookmarks[editorState.selectedBookmarkIndex].children[editorState.selectedSubBookmarkIndex];
        breadcrumbHTML += '<span class="editor-breadcrumb-separator">→</span>';
        breadcrumbHTML += `<span class="editor-breadcrumb-item active">${subBookmark.label || 'Untitled Sub-Bookmark'}</span>`;
    }

    breadcrumbHTML += '</div>';

    return breadcrumbHTML;
}

// ==================== QUICK ACTIONS ====================

function renderQuickActions() {
    if (editorState.editorMode === 'card') {
        return ''; // No quick actions for card settings
    }

    let actionsHTML = '<div class="editor-quick-actions">';

    if (editorState.editorMode === 'bookmark') {
        const bookmarkIndex = editorState.selectedBookmarkIndex;
        const isFirst = bookmarkIndex === 0;
        const isLast = bookmarkIndex === editorState.workingCopy.bookmarks.length - 1;

        actionsHTML += `<button class="editor-quick-action-btn primary" onclick="duplicateBookmark(${bookmarkIndex})">📋 Duplicate</button>`;
        actionsHTML += `<button class="editor-quick-action-btn" onclick="moveBookmarkUp(${bookmarkIndex})" ${isFirst ? 'disabled' : ''}>↑ Move Up</button>`;
        actionsHTML += `<button class="editor-quick-action-btn" onclick="moveBookmarkDown(${bookmarkIndex})" ${isLast ? 'disabled' : ''}>↓ Move Down</button>`;
        actionsHTML += `<button class="editor-quick-action-btn danger" onclick="deleteBookmark(${bookmarkIndex})">🗑️ Delete</button>`;
    }

    if (editorState.editorMode === 'subbookmark') {
        const bookmarkIndex = editorState.selectedBookmarkIndex;
        const subIndex = editorState.selectedSubBookmarkIndex;
        const children = editorState.workingCopy.bookmarks[bookmarkIndex].children;
        const isFirst = subIndex === 0;
        const isLast = subIndex === children.length - 1;

        actionsHTML += `<button class="editor-quick-action-btn primary" onclick="duplicateSubBookmark(${bookmarkIndex}, ${subIndex})">📋 Duplicate</button>`;
        actionsHTML += `<button class="editor-quick-action-btn" onclick="moveSubBookmarkUp(${bookmarkIndex}, ${subIndex})" ${isFirst ? 'disabled' : ''}>↑ Move Up</button>`;
        actionsHTML += `<button class="editor-quick-action-btn" onclick="moveSubBookmarkDown(${bookmarkIndex}, ${subIndex})" ${isLast ? 'disabled' : ''}>↓ Move Down</button>`;
        actionsHTML += `<button class="editor-quick-action-btn danger" onclick="deleteSubBookmark(${bookmarkIndex}, ${subIndex})">🗑️ Delete</button>`;
    }

    actionsHTML += '</div>';

    return actionsHTML;
}

// ==================== EDITOR PANEL RENDERING ====================

function renderEditorPanel() {
    if (editorState.editorMode === 'card') {
        return renderCardEditor();
    } else if (editorState.editorMode === 'bookmark') {
        return renderBookmarkEditor();
    } else if (editorState.editorMode === 'subbookmark') {
        return renderSubBookmarkEditor();
    }

    return '<div class="editor-empty-state"><div class="editor-empty-state-icon">📝</div><div class="editor-empty-state-title">Select an item to edit</div><div class="editor-empty-state-description">Click on a bookmark from the preview panel or edit card settings</div></div>';
}

function renderCardEditor() {
    const card = editorState.workingCopy;

    return `
        <div class="editor-form-section">
            <div class="editor-form-section-title">Card Details</div>

            <div class="editor-form-group-v2">
                <label>Card ID</label>
                <input type="text" value="${card.id}" onchange="updateCardField('id', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>Card Title</label>
                <input type="text" value="${card.title}" onchange="updateCardField('title', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>Card Description</label>
                <textarea onchange="updateCardField('description', this.value)">${card.description}</textarea>
            </div>

            <div class="editor-form-group-v2">
                <label>Pattern (Color Scheme)</label>
                <div class="editor-pattern-selector">
                    ${VALID_PATTERNS.map(p => `
                        <div class="editor-pattern-option ${card.pattern === p ? 'selected' : ''}" data-pattern="${p}" onclick="updateCardField('pattern', '${p}')">
                            ${p.charAt(0).toUpperCase() + p.slice(1)}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="editor-form-row-v2">
                <div class="editor-form-group-v2">
                    <label>Order</label>
                    <input type="number" value="${card.order}" onchange="updateCardField('order', parseInt(this.value))" />
                </div>

                <div class="editor-form-group-v2">
                    <div class="editor-checkbox-group-v2">
                        <input type="checkbox" id="cardEnabled" ${card.enabled ? 'checked' : ''} onchange="updateCardField('enabled', this.checked)" />
                        <label for="cardEnabled">Enabled (visible on dashboard)</label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderBookmarkEditor() {
    const bookmarkIndex = editorState.selectedBookmarkIndex;
    const bookmark = editorState.workingCopy.bookmarks[bookmarkIndex];

    return `
        <div class="editor-form-section">
            <div class="editor-form-section-title">Bookmark Details</div>

            <div class="editor-form-group-v2">
                <label>Bookmark ID</label>
                <input type="text" value="${bookmark.id || ''}" onchange="updateBookmarkField(${bookmarkIndex}, 'id', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>Label</label>
                <input type="text" value="${bookmark.label || ''}" onchange="updateBookmarkField(${bookmarkIndex}, 'label', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>URL</label>
                <input type="text" value="${bookmark.url || ''}" onchange="updateBookmarkField(${bookmarkIndex}, 'url', this.value)" />
            </div>

            <div class="editor-form-row-3-v2">
                <div class="editor-form-group-v2">
                    <label>Icon Type</label>
                    <select onchange="updateBookmarkField(${bookmarkIndex}, 'iconType', this.value)">
                        ${ICON_TYPES.map(type => `<option value="${type}" ${bookmark.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>

                <div class="editor-form-group-v2">
                    <label>Icon</label>
                    <div class="editor-icon-preview">
                        <div class="editor-icon-preview-display">
                            ${renderPreviewIcon(bookmark)}
                        </div>
                        <input type="text" value="${bookmark.icon || ''}" onchange="updateBookmarkField(${bookmarkIndex}, 'icon', this.value)" />
                    </div>
                </div>
            </div>

            <div class="editor-form-group-v2">
                <label>Tags</label>
                <div class="editor-tags-container-v2">
                    ${(bookmark.tags || []).map((tag, tagIndex) => `
                        <span class="editor-tag-v2">
                            ${tag}
                            <button class="editor-tag-remove-v2" onclick="removeBookmarkTag(${bookmarkIndex}, ${tagIndex})">×</button>
                        </span>
                    `).join('')}
                    <input type="text" class="editor-tag-input-v2" placeholder="Add tag..." onkeypress="addBookmarkTag(event, ${bookmarkIndex})" />
                </div>
            </div>

            <button class="editor-add-subbookmark-btn" onclick="addSubBookmark(${bookmarkIndex})">
                + Add Sub-Bookmark
            </button>
        </div>
    `;
}

function renderSubBookmarkEditor() {
    const bookmarkIndex = editorState.selectedBookmarkIndex;
    const subIndex = editorState.selectedSubBookmarkIndex;
    const subBookmark = editorState.workingCopy.bookmarks[bookmarkIndex].children[subIndex];

    return `
        <div class="editor-form-section">
            <div class="editor-form-section-title">Sub-Bookmark Details</div>

            <div class="editor-form-group-v2">
                <label>Sub-Bookmark ID</label>
                <input type="text" value="${subBookmark.id || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${subIndex}, 'id', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>Label</label>
                <input type="text" value="${subBookmark.label || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${subIndex}, 'label', this.value)" />
            </div>

            <div class="editor-form-group-v2">
                <label>URL</label>
                <input type="text" value="${subBookmark.url || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${subIndex}, 'url', this.value)" />
            </div>

            <div class="editor-form-row-3-v2">
                <div class="editor-form-group-v2">
                    <label>Icon Type</label>
                    <select onchange="updateSubBookmarkField(${bookmarkIndex}, ${subIndex}, 'iconType', this.value)">
                        ${ICON_TYPES.map(type => `<option value="${type}" ${subBookmark.iconType === type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>

                <div class="editor-form-group-v2">
                    <label>Icon</label>
                    <div class="editor-icon-preview">
                        <div class="editor-icon-preview-display">
                            ${renderPreviewIcon(subBookmark)}
                        </div>
                        <input type="text" value="${subBookmark.icon || ''}" onchange="updateSubBookmarkField(${bookmarkIndex}, ${subIndex}, 'icon', this.value)" />
                    </div>
                </div>
            </div>

            <div class="editor-form-group-v2">
                <label>Tags</label>
                <div class="editor-tags-container-v2">
                    ${(subBookmark.tags || []).map((tag, tagIndex) => `
                        <span class="editor-tag-v2">
                            ${tag}
                            <button class="editor-tag-remove-v2" onclick="removeSubBookmarkTag(${bookmarkIndex}, ${subIndex}, ${tagIndex})">×</button>
                        </span>
                    `).join('')}
                    <input type="text" class="editor-tag-input-v2" placeholder="Add tag..." onkeypress="addSubBookmarkTag(event, ${bookmarkIndex}, ${subIndex})" />
                </div>
            </div>
        </div>
    `;
}

// ==================== SELECTION FUNCTIONS ====================

function selectCardSettings() {
    editorState.editorMode = 'card';
    editorState.selectedBookmarkIndex = null;
    editorState.selectedSubBookmarkIndex = null;
    refreshEditor();
}

function selectBookmark(index) {
    editorState.editorMode = 'bookmark';
    editorState.selectedBookmarkIndex = index;
    editorState.selectedSubBookmarkIndex = null;
    refreshEditor();
}

function selectSubBookmark(bookmarkIndex, subIndex) {
    editorState.editorMode = 'subbookmark';
    editorState.selectedBookmarkIndex = bookmarkIndex;
    editorState.selectedSubBookmarkIndex = subIndex;
    refreshEditor();
}

function toggleSubBookmarks(index) {
    // This is just a visual toggle - no state change needed
    const subContainer = document.getElementById(`subBookmarks-${index}`);
    if (subContainer) {
        subContainer.style.display = subContainer.style.display === 'none' ? 'block' : 'none';
    }
}

// ==================== UPDATE FUNCTIONS ====================

function updateCardField(field, value) {
    editorState.workingCopy[field] = value;

    // Update header if title or pattern changed
    if (field === 'title') {
        const header = document.querySelector('.editor-modal-header-v2 h2');
        if (header) {
            header.textContent = `${editorState.isNewCard ? 'Create New Card' : 'Edit Card'}: ${value}`;
        }
    }

    if (field === 'pattern') {
        const header = document.querySelector('.editor-modal-header-v2');
        if (header) {
            header.setAttribute('data-pattern', value);
        }
    }

    validateWorkingCopy();
    refreshBreadcrumb();
}

function updateBookmarkField(bookmarkIndex, field, value) {
    editorState.workingCopy.bookmarks[bookmarkIndex][field] = value;
    validateWorkingCopy();
    refreshPreview();
    refreshBreadcrumb();
}

function updateSubBookmarkField(bookmarkIndex, childIndex, field, value) {
    editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex][field] = value;
    validateWorkingCopy();
    refreshPreview();
    refreshBreadcrumb();
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

    // Auto-select the new bookmark
    editorState.editorMode = 'bookmark';
    editorState.selectedBookmarkIndex = editorState.workingCopy.bookmarks.length - 1;
    editorState.selectedSubBookmarkIndex = null;

    validateWorkingCopy();
    refreshEditor();
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

    // Auto-select the new sub-bookmark
    editorState.editorMode = 'subbookmark';
    editorState.selectedBookmarkIndex = bookmarkIndex;
    editorState.selectedSubBookmarkIndex = editorState.workingCopy.bookmarks[bookmarkIndex].children.length - 1;

    validateWorkingCopy();
    refreshEditor();
}

// ==================== DELETE FUNCTIONS ====================

function deleteBookmark(bookmarkIndex) {
    const bookmark = editorState.workingCopy.bookmarks[bookmarkIndex];
    if (confirm(`Are you sure you want to delete "${bookmark.label}"?`)) {
        editorState.workingCopy.bookmarks.splice(bookmarkIndex, 1);

        // Return to card settings view
        editorState.editorMode = 'card';
        editorState.selectedBookmarkIndex = null;
        editorState.selectedSubBookmarkIndex = null;

        validateWorkingCopy();
        refreshEditor();
    }
}

function deleteSubBookmark(bookmarkIndex, childIndex) {
    const subBookmark = editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex];
    if (confirm(`Are you sure you want to delete "${subBookmark.label}"?`)) {
        editorState.workingCopy.bookmarks[bookmarkIndex].children.splice(childIndex, 1);

        // Return to parent bookmark view
        editorState.editorMode = 'bookmark';
        editorState.selectedBookmarkIndex = bookmarkIndex;
        editorState.selectedSubBookmarkIndex = null;

        validateWorkingCopy();
        refreshEditor();
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

    // Select the duplicated bookmark
    editorState.editorMode = 'bookmark';
    editorState.selectedBookmarkIndex = bookmarkIndex + 1;
    editorState.selectedSubBookmarkIndex = null;

    validateWorkingCopy();
    refreshEditor();
}

function duplicateSubBookmark(bookmarkIndex, childIndex) {
    const original = editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex];
    const existingIds = getAllIdsFromWorkingCopy();

    const duplicate = JSON.parse(JSON.stringify(original));
    duplicate.id = generateUniqueId(duplicate.label, existingIds);
    duplicate.label = `${duplicate.label} (Copy)`;

    editorState.workingCopy.bookmarks[bookmarkIndex].children.splice(childIndex + 1, 0, duplicate);

    // Select the duplicated sub-bookmark
    editorState.editorMode = 'subbookmark';
    editorState.selectedBookmarkIndex = bookmarkIndex;
    editorState.selectedSubBookmarkIndex = childIndex + 1;

    validateWorkingCopy();
    refreshEditor();
}

// ==================== MOVE FUNCTIONS ====================

function moveBookmarkUp(index) {
    if (index > 0) {
        const temp = editorState.workingCopy.bookmarks[index];
        editorState.workingCopy.bookmarks[index] = editorState.workingCopy.bookmarks[index - 1];
        editorState.workingCopy.bookmarks[index - 1] = temp;

        editorState.selectedBookmarkIndex = index - 1;

        validateWorkingCopy();
        refreshEditor();
    }
}

function moveBookmarkDown(index) {
    if (index < editorState.workingCopy.bookmarks.length - 1) {
        const temp = editorState.workingCopy.bookmarks[index];
        editorState.workingCopy.bookmarks[index] = editorState.workingCopy.bookmarks[index + 1];
        editorState.workingCopy.bookmarks[index + 1] = temp;

        editorState.selectedBookmarkIndex = index + 1;

        validateWorkingCopy();
        refreshEditor();
    }
}

function moveSubBookmarkUp(bookmarkIndex, subIndex) {
    if (subIndex > 0) {
        const children = editorState.workingCopy.bookmarks[bookmarkIndex].children;
        const temp = children[subIndex];
        children[subIndex] = children[subIndex - 1];
        children[subIndex - 1] = temp;

        editorState.selectedSubBookmarkIndex = subIndex - 1;

        validateWorkingCopy();
        refreshEditor();
    }
}

function moveSubBookmarkDown(bookmarkIndex, subIndex) {
    const children = editorState.workingCopy.bookmarks[bookmarkIndex].children;
    if (subIndex < children.length - 1) {
        const temp = children[subIndex];
        children[subIndex] = children[subIndex + 1];
        children[subIndex + 1] = temp;

        editorState.selectedSubBookmarkIndex = subIndex + 1;

        validateWorkingCopy();
        refreshEditor();
    }
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
            validateWorkingCopy();
            refreshEditor();
        }
    }
}

function removeBookmarkTag(bookmarkIndex, tagIndex) {
    editorState.workingCopy.bookmarks[bookmarkIndex].tags.splice(tagIndex, 1);
    validateWorkingCopy();
    refreshEditor();
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
            validateWorkingCopy();
            refreshEditor();
        }
    }
}

function removeSubBookmarkTag(bookmarkIndex, childIndex, tagIndex) {
    editorState.workingCopy.bookmarks[bookmarkIndex].children[childIndex].tags.splice(tagIndex, 1);
    validateWorkingCopy();
    refreshEditor();
}

// ==================== REFRESH FUNCTIONS ====================

function refreshEditor() {
    const previewPanel = document.getElementById('editorPreviewPanel');
    const editPanel = document.getElementById('editorEditPanel');

    if (previewPanel) {
        previewPanel.innerHTML = renderPreviewPanel();
    }

    if (editPanel) {
        editPanel.innerHTML = renderBreadcrumb() + renderQuickActions() + renderEditorPanel();
    }
}

function refreshPreview() {
    const previewPanel = document.getElementById('editorPreviewPanel');
    if (previewPanel) {
        previewPanel.innerHTML = renderPreviewPanel();
    }
}

function refreshBreadcrumb() {
    // Breadcrumb is part of editPanel, so it gets refreshed with editor
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
            validateBookmark(bookmark, `Bookmark ${bookmarkIndex + 1}`, allIds);

            // Validate sub-bookmarks
            if (bookmark.children) {
                bookmark.children.forEach((child, childIndex) => {
                    validateBookmark(child, `Bookmark ${bookmarkIndex + 1} → Sub-bookmark ${childIndex + 1}`, allIds);
                });
            }
        });
    }

    updateFooterStatus();
    return editorState.validationErrors.length === 0;
}

function validateBookmark(bookmark, path, allIds) {
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
        if (allIds.includes(bookmark.id)) {
            editorState.validationErrors.push(`${path}: Duplicate ID "${bookmark.id}"`);
        } else {
            allIds.push(bookmark.id);
        }
    }

    // Validate URL format
    if (bookmark.url && bookmark.url !== '#' && !bookmark.url.startsWith('http://') && !bookmark.url.startsWith('https://')) {
        editorState.validationErrors.push(`${path}: URL must start with http:// or https:// (or use # for parent bookmarks)`);
    }
}

function renderFooterStatus() {
    if (editorState.validationErrors.length > 0) {
        return `<div class="editor-error-badge">${editorState.validationErrors.length} error${editorState.validationErrors.length > 1 ? 's' : ''} found - fix to save</div>`;
    } else {
        return `<div class="editor-success-badge">✓ Ready to save</div>`;
    }
}

function updateFooterStatus() {
    const footerCenter = document.getElementById('editorFooterCenter');
    const saveBtn = document.getElementById('saveChangesBtn');

    if (footerCenter) {
        footerCenter.innerHTML = renderFooterStatus();
    }

    if (saveBtn) {
        saveBtn.disabled = editorState.validationErrors.length > 0;
    }
}

// ==================== SAVE/DISCARD ====================

function handleSaveChanges() {
    if (!validateWorkingCopy()) {
        alert('Please fix all errors before saving.');
        return;
    }

    // Update bookmarksData
    if (editorState.isNewCard) {
        bookmarksData.cards.push(editorState.workingCopy);
    } else {
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

    // Close modal
    closeModal();

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
    let successMsg = document.getElementById('editorSuccessMessage');
    if (!successMsg) {
        successMsg = document.createElement('div');
        successMsg.id = 'editorSuccessMessage';
        successMsg.className = 'editor-success-message-v2';
        document.body.appendChild(successMsg);
    }

    successMsg.textContent = message;
    successMsg.classList.add('active');

    setTimeout(() => {
        successMsg.classList.remove('active');
    }, 3000);
}

// ==================== UTILITY FUNCTIONS ====================

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

// ==================== GLOBAL SCOPE EXPORTS ====================

window.selectCardSettings = selectCardSettings;
window.selectBookmark = selectBookmark;
window.selectSubBookmark = selectSubBookmark;
window.toggleSubBookmarks = toggleSubBookmarks;
window.updateCardField = updateCardField;
window.updateBookmarkField = updateBookmarkField;
window.updateSubBookmarkField = updateSubBookmarkField;
window.addBookmark = addBookmark;
window.addSubBookmark = addSubBookmark;
window.deleteBookmark = deleteBookmark;
window.deleteSubBookmark = deleteSubBookmark;
window.duplicateBookmark = duplicateBookmark;
window.duplicateSubBookmark = duplicateSubBookmark;
window.moveBookmarkUp = moveBookmarkUp;
window.moveBookmarkDown = moveBookmarkDown;
window.moveSubBookmarkUp = moveSubBookmarkUp;
window.moveSubBookmarkDown = moveSubBookmarkDown;
window.addBookmarkTag = addBookmarkTag;
window.removeBookmarkTag = removeBookmarkTag;
window.addSubBookmarkTag = addSubBookmarkTag;
window.removeSubBookmarkTag = removeSubBookmarkTag;
window.handleSaveChanges = handleSaveChanges;
window.handleDiscardChanges = handleDiscardChanges;
