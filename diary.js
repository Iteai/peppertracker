// Diary variables
let diaryEntries = [];
let peppers = [];
let quickNotes = '';
let dbSync;
let selectedTags = [];
let selectedFiles = []; // Files selezionati
let photoDataUrls = []; // Photos convertite in Base64
let currentView = 'timeline';
let currentPhotoIndex = 0;
let currentPhotoEntry = null;

// DOM Elements
let hamburgerMenu, sidebar, overlay, closeBtn, container;
let addEntryBtn, galleryViewBtn, calendarViewBtn;
let plantFilter, tagFilter, searchInput;
let entryModal, entryForm, photoModal;
let uploadZone, photoPreview, entryPhotos;
let quickNotesTextarea;

// Statistics elements
let totalEntriesSpan, totalPhotosSpan, plantsDocumentedSpan, tagsUsedSpan;

// View elements
let timelineView, gridView, cardsView;
let timelineViewBtn, gridViewBtn, cardsViewBtn;

// Initialize database - VERSIONE HYBRID
async function initDatabase() {
    try {
        console.log('📖 Inizializzazione Diary database...');
        
        dbSync = new DatabaseSync();
        
        // Carica dati locali (priorità per le foto)
        const localData = dbSync.loadFromLocal();
        diaryEntries = localData.diaryEntries || [];
        quickNotes = localData.quickNotes || '';
        peppers = localData.peppers || [];
        
        // Solo sync cloud per metadata se necessario
        try {
            console.log('☁️ Syncing metadata from cloud...');
            const cloudData = await dbSync.loadFromCloud();
            
            // Aggiorna solo i dati non-foto
            if (cloudData.peppers) peppers = cloudData.peppers;
            if (cloudData.quickNotes) quickNotes = cloudData.quickNotes;
            
            // Per le entry, mantieni le foto locali ma aggiorna metadata
            if (cloudData.diaryEntries && cloudData.diaryEntries.length > 0) {
                // Merge intelligente: foto locali + metadata cloud
                const localEntryMap = new Map(diaryEntries.map(e => [e.id, e]));
                
                cloudData.diaryEntries.forEach(cloudEntry => {
                    const localEntry = localEntryMap.get(cloudEntry.id);
                    if (localEntry && localEntry.photos && localEntry.photos.some(p => p.data)) {
                        // Mantieni foto locali
                        cloudEntry.photos = localEntry.photos;
                    }
                });
                
                diaryEntries = cloudData.diaryEntries;
            }
            
        } catch (cloudError) {
            console.log('⚠️ Cloud sync failed, using local data');
        }
        
        console.log('✅ Diary inizializzato:', {
            entries: diaryEntries.length,
            peppers: peppers.length,
            notesLength: quickNotes.length,
            photosLocal: diaryEntries.filter(e => e.photos && e.photos.some(p => p.data)).length
        });
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Diary:', error);
        // Fallback ai dati locali
        const localData = dbSync?.loadFromLocal() || {};
        diaryEntries = localData.diaryEntries || [];
        quickNotes = localData.quickNotes || '';
        peppers = localData.peppers || [];
    }
}

// Sidebar functionality
function initSidebar() {
    hamburgerMenu = document.getElementById('hamburgerMenu');
    sidebar = document.getElementById('sidebar');
    overlay = document.getElementById('overlay');
    closeBtn = document.getElementById('closeBtn');
    container = document.querySelector('.container');
    
    if (!hamburgerMenu || !sidebar) return;
    
    hamburgerMenu.addEventListener('click', function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        container.classList.add('shifted');
        hamburgerMenu.style.display = 'none';
    });

    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        container.classList.remove('shifted');
        hamburgerMenu.style.display = 'block';
    }
}

// Initialize diary page
function initDiaryPage() {
    // Get DOM elements
    addEntryBtn = document.getElementById('addEntryBtn');
    galleryViewBtn = document.getElementById('galleryViewBtn');
    calendarViewBtn = document.getElementById('calendarViewBtn');
    
    plantFilter = document.getElementById('plantFilter');
    tagFilter = document.getElementById('tagFilter');
    searchInput = document.getElementById('searchInput');
    
    entryModal = document.getElementById('entryModal');
    entryForm = document.getElementById('entryForm');
    photoModal = document.getElementById('photoModal');
    
    uploadZone = document.getElementById('uploadZone');
    photoPreview = document.getElementById('photoPreview');
    entryPhotos = document.getElementById('entryPhotos');
    
    // Statistics
    totalEntriesSpan = document.getElementById('totalEntries');
    totalPhotosSpan = document.getElementById('totalPhotos');
    plantsDocumentedSpan = document.getElementById('plantsDocumented');
    tagsUsedSpan = document.getElementById('tagsUsed');
    
    // Views
    timelineView = document.getElementById('timelineView');
    gridView = document.getElementById('gridView');
    cardsView = document.getElementById('cardsView');
    
    timelineViewBtn = document.getElementById('timelineViewBtn');
    gridViewBtn = document.getElementById('gridViewBtn');
    cardsViewBtn = document.getElementById('cardsViewBtn');
    
    if (!addEntryBtn || !entryModal || !entryForm) {
        console.error('❌ Essential diary elements not found');
        return;
    }
    
    // Event listeners
    addEntryBtn.addEventListener('click', openEntryModal);
    galleryViewBtn?.addEventListener('click', () => switchView('grid'));
    calendarViewBtn?.addEventListener('click', showCalendarView);
    
    plantFilter?.addEventListener('change', applyFilters);
    tagFilter?.addEventListener('change', applyFilters);
    searchInput?.addEventListener('input', debounce(applyFilters, 300));
    
    // View switchers
    timelineViewBtn?.addEventListener('click', () => switchView('timeline'));
    gridViewBtn?.addEventListener('click', () => switchView('grid'));
    cardsViewBtn?.addEventListener('click', () => switchView('cards'));
    
    // Modal events
    document.getElementById('closeEntryModal')?.addEventListener('click', closeEntryModal);
    document.getElementById('cancelEntryBtn')?.addEventListener('click', closeEntryModal);
    document.getElementById('closePhotoModal')?.addEventListener('click', closePhotoModal);
    entryForm.addEventListener('submit', saveEntry);
    
    // Photo upload events
    initPhotoUpload();
    
    // Tags input events
    initTagsInput();
    
    // Quick notes
    initQuickNotes();
    
    // Set today's date as default
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dateInput = document.getElementById('entryDate');
    if (dateInput) {
        dateInput.value = now.toISOString().slice(0, 16);
    }
    
    // Populate selectors
    populatePlantSelector();
    
    // Load entries
    renderCurrentView();
    updateStatistics();
}

// Initialize Quick Notes
function initQuickNotes() {
    const diaryContent = document.querySelector('.diary-content');
    if (!diaryContent) return;
    
    const quickNotesSection = document.createElement('div');
    quickNotesSection.className = 'quick-notes-section';
    quickNotesSection.innerHTML = `
        <div class="quick-notes-header">
            <h3><i class="fas fa-sticky-note"></i> Block Notes Rapido</h3>
            <div class="notes-actions">
                <button id="saveNotesBtn" class="btn btn-sm btn-primary">
                    <i class="fas fa-save"></i> Salva
                </button>
                <button id="clearNotesBtn" class="btn btn-sm btn-secondary">
                    <i class="fas fa-trash"></i> Pulisci
                </button>
            </div>
        </div>
        <textarea id="quickNotesTextarea" class="quick-notes-textarea" 
                  placeholder="Scrivi qui le tue idee veloci, pensieri futuri, promemoria...
                  
Esempio:
- Testare incrocio Arlecchino x Habanero
- Controllare pH terreno pianta #3
- Ordinare semi varietà Rocoto
- Idea: creare sistema irrigazione automatico"></textarea>
        <div class="notes-info">
            <small><i class="fas fa-cloud"></i> Sincronizzato automaticamente tra dispositivi</small>
            <span id="notesSavedIndicator" class="notes-saved">✓ Salvato</span>
        </div>
    `;
    
    // Insert before diary content
    diaryContent.parentNode.insertBefore(quickNotesSection, diaryContent);
    
    // Get textarea and load content
    quickNotesTextarea = document.getElementById('quickNotesTextarea');
    if (quickNotesTextarea) {
        quickNotesTextarea.value = quickNotes || '';
        
        // Auto-save on typing (debounced)
        quickNotesTextarea.addEventListener('input', debounce(saveQuickNotes, 1000));
        
        // Manual save button
        document.getElementById('saveNotesBtn')?.addEventListener('click', saveQuickNotes);
        
        // Clear button
        document.getElementById('clearNotesBtn')?.addEventListener('click', function() {
            if (confirm('Sei sicuro di voler pulire tutte le note?')) {
                quickNotesTextarea.value = '';
                saveQuickNotes();
            }
        });
    }
}

// Save quick notes
async function saveQuickNotes() {
    if (!quickNotesTextarea) return;
    
    quickNotes = quickNotesTextarea.value;
    
    try {
        // Salvataggio local + cloud sync
        dbSync.saveToLocal({
            peppers: peppers,
            diaryEntries: diaryEntries,
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        
        // Cloud sync solo per metadata
        const diaryEntriesForCloud = diaryEntries.map(entry => ({
            ...entry,
            photos: entry.photos ? entry.photos.map(photo => ({
                id: photo.id,
                filename: photo.filename,
                size: photo.size,
                type: photo.type,
                uploadDate: photo.uploadDate
            })) : []
        }));
        
        await dbSync.saveToCloud({
            peppers: peppers,
            diaryEntries: diaryEntriesForCloud,
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        
        // Show saved indicator
        const indicator = document.getElementById('notesSavedIndicator');
        if (indicator) {
            indicator.style.opacity = '1';
            setTimeout(() => {
                indicator.style.opacity = '0.5';
            }, 2000);
        }
        
        console.log('✅ Quick notes salvate');
        
    } catch (error) {
        console.error('❌ Errore salvataggio quick notes:', error);
    }
}

// Initialize photo upload
function initPhotoUpload() {
    if (!uploadZone || !entryPhotos) return;
    
    // Click to select files
    uploadZone.addEventListener('click', () => {
        entryPhotos.click();
    });
    
    // File input change
    entryPhotos.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (files.length > 0) {
            handleFiles(files);
        }
    });
}

// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// Handle multiple files - VERSIONE FIXED
async function handleFiles(files) {
    console.log('📁 handleFiles called with', files.length, 'files');
    
    // Limit to 10 files
    const limitedFiles = files.slice(0, 10);
    
    // Salva i file nelle variabili globali
    selectedFiles = Array.from(limitedFiles);
    photoDataUrls = [];
    
    // Clear previous preview
    if (photoPreview) {
        photoPreview.innerHTML = '';
    }
    
    for (let i = 0; i < limitedFiles.length; i++) {
        const file = limitedFiles[i];
        console.log('🖼️ Creating preview for:', file.name);
        
        try {
            // Converti subito in Base64 e salva
            const base64 = await fileToBase64(file);
            photoDataUrls.push({
                file: file,
                base64: base64,
                index: i
            });
            
            const previewDiv = document.createElement('div');
            previewDiv.className = 'photo-preview-item';
            previewDiv.innerHTML = `
                <img src="${base64}" alt="Preview ${i + 1}">
                <div class="photo-preview-overlay">
                    <button type="button" class="remove-photo-btn" data-index="${i}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="photo-info">
                    <small>${file.name}</small>
                    <small>${(file.size / 1024 / 1024).toFixed(1)}MB</small>
                </div>
            `;
            
            if (photoPreview) {
                photoPreview.appendChild(previewDiv);
            }
            
        } catch (error) {
            console.error('❌ Error processing file:', file.name, error);
        }
    }
    
    // Show preview area
    if (photoPreview) {
        photoPreview.style.display = 'grid';
    }
    
    console.log('✅ Files processed and saved:', photoDataUrls.length);
    
    // Add remove functionality
    if (photoPreview) {
        photoPreview.addEventListener('click', function(e) {
            if (e.target.closest('.remove-photo-btn')) {
                const index = parseInt(e.target.closest('.remove-photo-btn').dataset.index);
                const previewItem = e.target.closest('.photo-preview-item');
                previewItem.remove();
                
                // Remove from arrays
                photoDataUrls = photoDataUrls.filter(item => item.index !== index);
                selectedFiles = selectedFiles.filter((file, i) => i !== index);
            }
        });
    }
}

// Initialize tags input
function initTagsInput() {
    const tagsInput = document.getElementById('entryTags');
    const selectedTagsDiv = document.getElementById('selectedTags');
    const suggestions = document.querySelectorAll('.tag-suggestion');
    
    if (!tagsInput || !selectedTagsDiv) return;
    
    // Handle Enter key for adding tags
    tagsInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = this.value.trim().toLowerCase();
            if (tag && !selectedTags.includes(tag)) {
                addTag(tag);
                this.value = '';
            }
        }
    });
    
    // Handle tag suggestions
    suggestions.forEach(suggestion => {
        suggestion.addEventListener('click', function() {
            const tag = this.dataset.tag;
            if (!selectedTags.includes(tag)) {
                addTag(tag);
            }
        });
    });
    
    function addTag(tag) {
        selectedTags.push(tag);
        updateTagsDisplay();
    }
    
    function removeTag(tag) {
        selectedTags = selectedTags.filter(t => t !== tag);
        updateTagsDisplay();
    }
    
    function updateTagsDisplay() {
        selectedTagsDiv.innerHTML = selectedTags.map(tag => `
            <span class="selected-tag">
                ${tag}
                <button type="button" class="remove-tag" data-tag="${tag}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
        
        // Add remove functionality
        selectedTagsDiv.addEventListener('click', function(e) {
            if (e.target.closest('.remove-tag')) {
                const tag = e.target.closest('.remove-tag').dataset.tag;
                removeTag(tag);
            }
        });
    }
}

// Populate plant selector
function populatePlantSelector() {
    const plantSelect = document.getElementById('entryPlant');
    const plantFilterSelect = document.getElementById('plantFilter');
    
    if (!plantSelect || !plantFilterSelect) return;
    
    // Clear existing options (keep first option)
    plantSelect.innerHTML = '<option value="">Nessuna pianta specifica</option>';
    plantFilterSelect.innerHTML = '<option value="all">Tutte le Piante</option>';
    
    peppers.forEach(pepper => {
        const option1 = document.createElement('option');
        option1.value = pepper.id;
        option1.textContent = pepper.name;
        plantSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = pepper.id;
        option2.textContent = pepper.name;
        plantFilterSelect.appendChild(option2);
    });
}

// Open entry modal
function openEntryModal(entryId = null) {
    if (!entryModal || !entryForm) return;
    
    if (entryId) {
        // Edit existing entry
        const entry = diaryEntries.find(e => e.id === entryId);
        if (entry) {
            document.getElementById('entryModalTitle').textContent = 'Modifica Entry';
            populateEntryForm(entry);
            entryForm.setAttribute('data-id', entryId);
        }
    } else {
        // New entry
        document.getElementById('entryModalTitle').textContent = 'Nuova Entry';
        entryForm.reset();
        entryForm.removeAttribute('data-id');
        selectedTags = [];
        selectedFiles = [];
        photoDataUrls = [];
        if (photoPreview) {
            photoPreview.innerHTML = '';
            photoPreview.style.display = 'none';
        }
        
        // Set current date/time
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const dateInput = document.getElementById('entryDate');
        if (dateInput) {
            dateInput.value = now.toISOString().slice(0, 16);
        }
    }
    
    entryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close entry modal - VERSIONE FIXED
function closeEntryModal() {
    if (!entryModal) return;
    
    entryModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    selectedTags = [];
    
    // Reset le variabili globali
    selectedFiles = [];
    photoDataUrls = [];
    
    if (photoPreview) {
        photoPreview.innerHTML = '';
        photoPreview.style.display = 'none';
    }
}

// Save entry - VERSIONE LOCAL PHOTOS + CLOUD METADATA
async function saveEntry(e) {
    e.preventDefault();
    
    console.log('🚀 Saving entry...');
    console.log('📷 PhotoDataUrls available:', photoDataUrls.length);
    
    const formData = new FormData(entryForm);
    const entryId = entryForm.getAttribute('data-id');
    
    // Processa le foto per storage locale
    const photos = [];
    
    console.log('🔄 Processing', photoDataUrls.length, 'photos for local storage...');
    
    for (let i = 0; i < photoDataUrls.length; i++) {
        const photoData = photoDataUrls[i];
        console.log('📷 Processing photo:', photoData.file.name);
        
        try {
            const photoObj = {
                id: Date.now() + Math.random(),
                filename: photoData.file.name,
                size: photoData.file.size,
                type: photoData.file.type,
                data: photoData.base64, // FOTO SALVATA LOCALMENTE
                uploadDate: new Date().toISOString()
            };
            
            photos.push(photoObj);
            console.log('✅ Photo stored locally:', photoObj.filename);
            
        } catch (error) {
            console.error('❌ Error processing photo:', error);
        }
    }
    
    console.log('📷 Total photos stored locally:', photos.length);
    
    // Entry con foto per storage locale
    const entryData = {
        id: entryId ? parseInt(entryId) : Date.now(),
        date: formData.get('entryDate'),
        plantId: formData.get('entryPlant') || null,
        plantName: formData.get('entryPlant') ? 
            peppers.find(p => p.id == formData.get('entryPlant'))?.name || null : null,
        title: formData.get('entryTitle'),
        content: formData.get('entryContent'),
        tags: [...selectedTags],
        photos: photos, // FOTO COMPLETE LOCALI
        createdAt: entryId ? 
            diaryEntries.find(e => e.id == entryId)?.createdAt || new Date().toISOString() :
            new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    console.log('📝 Entry data:', {
        title: entryData.title,
        photosCount: entryData.photos.length,
        localPhotos: 'FULL',
        cloudPhotos: 'METADATA_ONLY'
    });
    
    if (entryId) {
        // Update existing entry
        const index = diaryEntries.findIndex(e => e.id == entryId);
        if (index !== -1) {
            // Keep existing photos if no new ones uploaded
            if (photos.length === 0) {
                console.log('⚠️ No new photos, keeping existing ones');
                entryData.photos = diaryEntries[index].photos || [];
            }
            diaryEntries[index] = entryData; // LOCAL: foto complete
        }
    } else {
        // Add new entry
        diaryEntries.unshift(entryData); // LOCAL: foto complete
    }
    
    // SALVATAGGIO SPLIT
    try {
        // 1. SALVATAGGIO LOCALE (con foto complete)
        console.log('💾 Saving locally with photos...');
        dbSync.saveToLocal({
            peppers: peppers,
            diaryEntries: diaryEntries, // CON FOTO COMPLETE
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Saved locally with photos');
        
        // 2. SALVATAGGIO CLOUD (solo metadata, NO foto)
        console.log('☁️ Syncing metadata to cloud...');
        const diaryEntriesForCloud = diaryEntries.map(entry => ({
            ...entry,
            photos: entry.photos ? entry.photos.map(photo => ({
                id: photo.id,
                filename: photo.filename,
                size: photo.size,
                type: photo.type,
                uploadDate: photo.uploadDate
                // NO data field per il cloud
            })) : []
        }));
        
        await dbSync.saveToCloud({
            peppers: peppers,
            diaryEntries: diaryEntriesForCloud, // SOLO METADATA
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Metadata synced to cloud');
        
    } catch (error) {
        console.error('❌ Sync error (photos saved locally):', error);
        // Le foto sono comunque salvate localmente!
    }
    
    console.log('✅ Entry saved successfully');
    
    closeEntryModal();
    renderCurrentView();
    updateStatistics();
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Switch view
function switchView(view) {
    currentView = view;
    
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    const viewBtn = document.getElementById(view + 'ViewBtn');
    if (viewBtn) viewBtn.classList.add('active');
    
    // Update views
    document.querySelectorAll('.diary-view').forEach(v => v.classList.remove('active'));
    const viewElement = document.getElementById(view + 'View');
    if (viewElement) viewElement.classList.add('active');
    
    renderCurrentView();
}

// Render current view
function renderCurrentView() {
    switch (currentView) {
        case 'timeline':
            renderTimelineView();
            break;
        case 'grid':
            renderGridView();
            break;
        case 'cards':
            renderCardsView();
            break;
    }
}

// Render timeline view
function renderTimelineView() {
    const timeline = document.getElementById('diaryTimeline');
    if (!timeline) return;
    
    if (diaryEntries.length === 0) {
        timeline.innerHTML = `
            <div class="no-entries">
                <i class="fas fa-book-open"></i>
                <h3>Nessuna entry nel diario</h3>
                <p>Inizia a documentare i tuoi esperimenti con i peperoncini!</p>
                <button class="btn btn-primary" onclick="openEntryModal()">
                    <i class="fas fa-plus"></i> Prima Entry
                </button>
            </div>
        `;
        return;
    }
    
    const sortedEntries = [...diaryEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    timeline.innerHTML = sortedEntries.map(entry => `
        <div class="timeline-entry" data-id="${entry.id}">
            <div class="timeline-date">
                <div class="date-circle">
                    ${new Date(entry.date).getDate()}
                </div>
                <div class="date-text">
                    ${new Date(entry.date).toLocaleDateString('it-IT', { 
                        month: 'short', 
                        year: 'numeric' 
                    })}
                </div>
            </div>
            <div class="timeline-content">
                <div class="entry-header">
                    <h3 class="entry-title">${entry.title}</h3>
                    <div class="entry-meta">
                        ${entry.plantName ? `<span class="entry-plant"><i class="fas fa-seedling"></i> ${entry.plantName}</span>` : ''}
                        <span class="entry-time">${new Date(entry.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                
                ${entry.photos && entry.photos.length > 0 ? `
                    <div class="entry-photos">
                        ${entry.photos.slice(0, 4).map((photo, index) => `
                            <img src="${photo.data}" alt="${photo.filename}" 
                                 class="entry-photo" 
                                 onclick="openPhotoModal(${entry.id}, ${index})">
                        `).join('')}
                        ${entry.photos.length > 4 ? `
                            <div class="more-photos" onclick="openPhotoModal(${entry.id}, 0)">
                                +${entry.photos.length - 4}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="entry-content">${entry.content}</div>
                
                ${entry.tags && entry.tags.length > 0 ? `
                    <div class="entry-tags">
                        ${entry.tags.map(tag => `<span class="entry-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="entry-actions">
                    <button onclick="openEntryModal(${entry.id})" class="btn-icon" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteEntry(${entry.id})" class="btn-icon btn-danger" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Render grid view (photo gallery) - VERSIONE CORRETTA
function renderGridView() {
    const grid = document.getElementById('diaryGrid');
    
    if (!grid) {
        console.error('❌ Grid container not found');
        return;
    }
    
    // Get all photos from all entries
    const allPhotos = [];
    diaryEntries.forEach(entry => {
        if (entry.photos && Array.isArray(entry.photos)) {
            entry.photos.forEach((photo, index) => {
                allPhotos.push({
                    ...photo,
                    entryId: entry.id,
                    entryTitle: entry.title,
                    entryDate: entry.date,
                    photoIndex: index
                });
            });
        }
    });
    
    console.log('📷 Total photos found:', allPhotos.length);
    
    if (allPhotos.length === 0) {
        grid.innerHTML = `
            <div class="no-photos">
                <i class="fas fa-images"></i>
                <h3>Nessuna foto caricata</h3>
                <p>Le foto delle tue entry appariranno qui</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    allPhotos.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
    
    grid.innerHTML = allPhotos.map(photo => {
        // Verifica che photo.data esista
        if (!photo.data) {
            console.warn('⚠️ Photo without data:', photo);
            return '';
        }
        
        return `
            <div class="grid-photo-item" onclick="openPhotoModal(${photo.entryId}, ${photo.photoIndex})">
                <img src="${photo.data}" alt="${photo.filename || 'Photo'}" 
                     onerror="console.error('❌ Failed to load image:', this.src.substring(0, 50) + '...')">
                <div class="grid-photo-overlay">
                    <div class="grid-photo-info">
                        <div class="grid-photo-title">${photo.entryTitle}</div>
                        <div class="grid-photo-date">${new Date(photo.entryDate).toLocaleDateString('it-IT')}</div>
                    </div>
                </div>
            </div>
        `;
    }).filter(item => item !== '').join('');
    
    console.log('✅ Grid rendered with', allPhotos.length, 'photos');
}

// Render cards view
function renderCardsView() {
    const cards = document.getElementById('diaryCards');
    if (!cards) return;
    
    if (diaryEntries.length === 0) {
        cards.innerHTML = `
            <div class="no-cards">
                <i class="fas fa-clone"></i>
                <h3>Nessuna entry disponibile</h3>
                <p>Crea la tua prima entry del diario</p>
            </div>
        `;
        return;
    }
    
    const sortedEntries = [...diaryEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    cards.innerHTML = sortedEntries.map(entry => `
        <div class="diary-card" data-id="${entry.id}">
            ${entry.photos && entry.photos.length > 0 ? `
                <div class="card-image">
                    <img src="${entry.photos[0].data}" alt="${entry.title}">
                    ${entry.photos.length > 1 ? `
                        <div class="card-photo-count">
                            <i class="fas fa-images"></i> ${entry.photos.length}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${entry.title}</h3>
                    <div class="card-date">${new Date(entry.date).toLocaleDateString('it-IT')}</div>
                </div>
                
                ${entry.plantName ? `
                    <div class="card-plant">
                        <i class="fas fa-seedling"></i> ${entry.plantName}
                    </div>
                ` : ''}
                
                <div class="card-description">
                    ${entry.content.length > 150 ? entry.content.substring(0, 150) + '...' : entry.content}
                </div>
                
                ${entry.tags && entry.tags.length > 0 ? `
                    <div class="card-tags">
                        ${entry.tags.slice(0, 3).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                        ${entry.tags.length > 3 ? `<span class="card-tag-more">+${entry.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
                
                <div class="card-actions">
                    <button onclick="openEntryModal(${entry.id})" class="btn btn-sm btn-secondary">
                        <i class="fas fa-edit"></i> Modifica
                    </button>
                    ${entry.photos && entry.photos.length > 0 ? `
                        <button onclick="openPhotoModal(${entry.id}, 0)" class="btn btn-sm btn-primary">
                            <i class="fas fa-images"></i> Foto
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Open photo modal
function openPhotoModal(entryId, photoIndex = 0) {
    const entry = diaryEntries.find(e => e.id === entryId);
    if (!entry || !entry.photos || entry.photos.length === 0) return;
    
    currentPhotoEntry = entry;
    currentPhotoIndex = photoIndex;
    
    updatePhotoModal();
    if (photoModal) {
        photoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Update photo modal content
function updatePhotoModal() {
    if (!currentPhotoEntry || !currentPhotoEntry.photos) return;
    
    const photo = currentPhotoEntry.photos[currentPhotoIndex];
    const photoImg = document.getElementById('photoViewerImg');
    const photoTitle = document.getElementById('photoTitle');
    const photoDate = document.getElementById('photoDate');
    const photoCounter = document.getElementById('photoCounter');
    const photoTagsDisplay = document.getElementById('photoTagsDisplay');
    const photoDescriptionDisplay = document.getElementById('photoDescriptionDisplay');
    
    if (photoImg) photoImg.src = photo.data;
    if (photoTitle) photoTitle.textContent = currentPhotoEntry.title;
    if (photoDate) photoDate.textContent = new Date(currentPhotoEntry.date).toLocaleDateString('it-IT');
    if (photoCounter) photoCounter.textContent = `${currentPhotoIndex + 1} / ${currentPhotoEntry.photos.length}`;
    
    // Update tags
    if (photoTagsDisplay) {
        if (currentPhotoEntry.tags && currentPhotoEntry.tags.length > 0) {
            photoTagsDisplay.innerHTML = currentPhotoEntry.tags.map(tag => 
                `<span class="photo-tag">${tag}</span>`
            ).join('');
        } else {
            photoTagsDisplay.innerHTML = '';
        }
    }
    
    // Update description
    if (photoDescriptionDisplay) {
        photoDescriptionDisplay.textContent = currentPhotoEntry.content || '';
    }
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    if (prevBtn) prevBtn.disabled = currentPhotoIndex === 0;
    if (nextBtn) nextBtn.disabled = currentPhotoIndex === currentPhotoEntry.photos.length - 1;
}

// Close photo modal
function closePhotoModal() {
    if (photoModal) {
        photoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    currentPhotoEntry = null;
    currentPhotoIndex = 0;
}

// Photo navigation
document.addEventListener('DOMContentLoaded', function() {
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPhotoIndex > 0) {
                currentPhotoIndex--;
                updatePhotoModal();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentPhotoEntry && currentPhotoIndex < currentPhotoEntry.photos.length - 1) {
                currentPhotoIndex++;
                updatePhotoModal();
            }
        });
    }
});

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Sei sicuro di voler eliminare questa entry? Verranno eliminate anche tutte le foto associate.')) {
        return;
    }
    
    diaryEntries = diaryEntries.filter(e => e.id !== entryId);
    
    try {
        // Local save
        dbSync.saveToLocal({
            peppers: peppers,
            diaryEntries: diaryEntries,
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        
        // Cloud sync (metadata only)
        const diaryEntriesForCloud = diaryEntries.map(entry => ({
            ...entry,
            photos: entry.photos ? entry.photos.map(photo => ({
                id: photo.id,
                filename: photo.filename,
                size: photo.size,
                type: photo.type,
                uploadDate: photo.uploadDate
            })) : []
        }));
        
        await dbSync.saveToCloud({
            peppers: peppers,
            diaryEntries: diaryEntriesForCloud,
            quickNotes: quickNotes,
            lastUpdate: new Date().toISOString()
        });
        
        console.log('✅ Entry eliminata');
        renderCurrentView();
        updateStatistics();
        
    } catch (error) {
        console.error('❌ Errore eliminazione entry:', error);
    }
}

// Apply filters - VERSIONE CORRETTA
function applyFilters() {
    const plantId = plantFilter?.value;
    const tag = tagFilter?.value;
    const searchTerm = searchInput?.value.toLowerCase();
    
    let filteredEntries = [...diaryEntries];
    
    // Filter by plant
    if (plantId && plantId !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
            entry.plantId && entry.plantId == plantId
        );
    }
    
    // Filter by tag
    if (tag && tag !== 'all') {
        filteredEntries = filteredEntries.filter(entry => 
            entry.tags && entry.tags.includes(tag)
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredEntries = filteredEntries.filter(entry => 
            entry.title.toLowerCase().includes(searchTerm) ||
            entry.content.toLowerCase().includes(searchTerm) ||
            (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    // Temporarily replace diaryEntries for rendering
    const originalEntries = diaryEntries;
    diaryEntries = filteredEntries;
    renderCurrentView();
    diaryEntries = originalEntries; // RESTORE ORIGINAL DATA
}

// Update statistics
function updateStatistics() {
    if (totalEntriesSpan) totalEntriesSpan.textContent = diaryEntries.length;
    
    const totalPhotos = diaryEntries.reduce((sum, entry) => 
        sum + (entry.photos ? entry.photos.length : 0), 0
    );
    if (totalPhotosSpan) totalPhotosSpan.textContent = totalPhotos;
    
    const plantsWithEntries = new Set(
        diaryEntries.filter(e => e.plantId).map(e => e.plantId)
    ).size;
    if (plantsDocumentedSpan) plantsDocumentedSpan.textContent = plantsWithEntries;
    
    const allTags = new Set();
    diaryEntries.forEach(entry => {
        if (entry.tags) {
            entry.tags.forEach(tag => allTags.add(tag));
        }
    });
    if (tagsUsedSpan) tagsUsedSpan.textContent = allTags.size;
}

// Show calendar view (placeholder)
function showCalendarView() {
    alert('🗓️ Vista calendario in arrivo nel prossimo aggiornamento!');
}

// Utility: debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('📖 Avvio Diary Page...');
        
        // Initialize components
        initSidebar();
        initDiaryPage();
        
        // Load data
        await initDatabase();
        
        // Populate selectors with data
        populatePlantSelector();
        
        // Render initial view
        renderCurrentView();
        updateStatistics();
        
        console.log('✅ Diary inizializzato con successo');
        
    } catch (error) {
        console.error('❌ Errore avvio Diary app:', error);
    }
});
