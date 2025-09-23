// Database variables
let databasePeppers = [];
let dbSync;

// Declare DOM elements variables (will be assigned when DOM is ready)
let hamburgerMenu, sidebar, overlay, closeBtn, container;
let databaseSearchInput, addDatabasePepperBtn, databaseModal;
let closeDatabaseModal, cancelDatabaseBtn, databaseForm, databaseModalTitle;
let isHybridCheckbox, hybridFields, motherPlantSelect, fatherPlantSelect;
let typeFilter, sortBy;

// Initialize database
async function initDatabase() {
    try {
        console.log('🔄 Inizializzazione database...');
        
        // Carica SOLO i databasePeppers (non i peppers del tracker)
        const localData = dbSync.loadFromLocal();
        databasePeppers = localData.databasePeppers || [];
        
        // Sincronizza con il cloud del database
        const data = await dbSync.sync();
        databasePeppers = data.databasePeppers || [];
        
        console.log('✅ Database inizializzato con', databasePeppers.length, 'peperoncini');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        // Fallback ai dati locali del database
        const localData = dbSync.loadFromLocal();
        databasePeppers = localData.databasePeppers || [];
        
        console.log('✅ Fallback: Database con', databasePeppers.length, 'peperoncini');
    }
}

// Sidebar functionality
function initSidebar() {
    // Get DOM elements when DOM is ready
    hamburgerMenu = document.getElementById('hamburgerMenu');
    sidebar = document.getElementById('sidebar');
    overlay = document.getElementById('overlay');
    closeBtn = document.getElementById('closeBtn');
    container = document.querySelector('.container');
    
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

// Database Functions
function initDatabasePage() {
    // Get DOM elements when DOM is ready
    databaseSearchInput = document.getElementById('databaseSearchInput');
    addDatabasePepperBtn = document.getElementById('addDatabasePepperBtn');
    databaseModal = document.getElementById('databaseModal');
    closeDatabaseModal = document.getElementById('closeDatabaseModal');
    cancelDatabaseBtn = document.getElementById('cancelDatabaseBtn');
    databaseForm = document.getElementById('databaseForm');
    databaseModalTitle = document.getElementById('databaseModalTitle');
    isHybridCheckbox = document.getElementById('isHybrid');
    hybridFields = document.getElementById('hybridFields');
    motherPlantSelect = document.getElementById('motherPlant');
    fatherPlantSelect = document.getElementById('fatherPlant');
    typeFilter = document.getElementById('typeFilter');
    sortBy = document.getElementById('sortBy');
    
    // Controlli di sicurezza
    if (!databaseSearchInput || !addDatabasePepperBtn || !typeFilter || !sortBy) {
        console.error('❌ Elementi DOM non trovati');
        return;
    }
    
    addDatabasePepperBtn.addEventListener('click', function() {
        openDatabaseModal();
    });
    
    databaseSearchInput.addEventListener('input', function() {
        applyFilters();
    });
    
    typeFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    sortBy.addEventListener('change', function() {
        applyFilters();
    });
    
    // Hybrid checkbox functionality
    isHybridCheckbox.addEventListener('change', function() {
        if (this.checked) {
            hybridFields.style.display = 'block';
            updateParentSelects();
        } else {
            hybridFields.style.display = 'none';
        }
    });

    // Modal close events
    closeDatabaseModal.addEventListener('click', closeDatabaseModalFunc);
    cancelDatabaseBtn.addEventListener('click', closeDatabaseModalFunc);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === databaseModal) {
            closeDatabaseModalFunc();
        }
    });

    // Form submit
    databaseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveDatabasePepper();
    });
}

function openDatabaseModal(pepperId = null) {
    if (pepperId) {
        // Editing existing database pepper
        const pepper = databasePeppers.find(p => p.id === pepperId);
        if (pepper) {
            databaseModalTitle.textContent = 'Modifica Database';
            populateDatabaseForm(pepper);
            databaseForm.setAttribute('data-id', pepperId);
        }
    } else {
        // Adding new database pepper
        databaseModalTitle.textContent = 'Aggiungi al Database';
        databaseForm.reset();
        databaseForm.removeAttribute('data-id');
        hybridFields.style.display = 'none';
        isHybridCheckbox.checked = false;
    }
    
    databaseModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDatabaseModalFunc() {
    databaseModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    databaseForm.reset();
    databaseForm.removeAttribute('data-id');
    hybridFields.style.display = 'none';
}

function updateParentSelects() {
    // Clear existing options
    motherPlantSelect.innerHTML = '<option value="">Seleziona pianta madre</option>';
    fatherPlantSelect.innerHTML = '<option value="">Seleziona pianta padre</option>';
    
    // Add database peppers as options (exclude hybrids to avoid circular references)
    databasePeppers.filter(p => !p.isHybrid).forEach(pepper => {
        const option1 = document.createElement('option');
        option1.value = pepper.id;
        option1.textContent = `${pepper.name} (${pepper.species})`;
        motherPlantSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = pepper.id;
        option2.textContent = `${pepper.name} (${pepper.species})`;
        fatherPlantSelect.appendChild(option2);
    });
}

async function saveDatabasePepper() {
    const name = document.getElementById('databasePepperName').value;
    const species = document.getElementById('databasePepperSpecies').value;
    const isHybrid = document.getElementById('isHybrid').checked;
    const motherPlant = motherPlantSelect.value;
    const fatherPlant = fatherPlantSelect.value;
    
    const pepperId = databaseForm.getAttribute('data-id');
    
    const motherPlantName = isHybrid && motherPlant ? 
        databasePeppers.find(p => p.id == motherPlant)?.name : null;
    const fatherPlantName = isHybrid && fatherPlant ? 
        databasePeppers.find(p => p.id == fatherPlant)?.name : null;
    
    if (pepperId) {
        // Update existing pepper
        const index = databasePeppers.findIndex(p => p.id == parseInt(pepperId));
        if (index !== -1) {
            databasePeppers[index] = {
                ...databasePeppers[index],
                name,
                species,
                isHybrid,
                motherPlant: isHybrid ? motherPlant : null,
                fatherPlant: isHybrid ? fatherPlant : null,
                motherPlantName,
                fatherPlantName
            };
        }
    } else {
        // Add new pepper
        const newPepper = {
            id: databasePeppers.length > 0 ? Math.max(...databasePeppers.map(p => p.id)) + 1 : 1,
            name,
            species,
            isHybrid,
            motherPlant: isHybrid ? motherPlant : null,
            fatherPlant: isHybrid ? fatherPlant : null,
            motherPlantName,
            fatherPlantName,
            dateAdded: new Date().toISOString().split('T')[0]
        };
        databasePeppers.push(newPepper);
    }

    // Salva SOLO nel database (non toccare i peppers del tracker)
    try {
        await dbSync.saveData({
            databasePeppers: databasePeppers,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Database pepper salvato (separato dal tracker)');
    } catch (error) {
        console.error('❌ Errore salvataggio database:', error);
    }

    renderDatabaseTable();
    closeDatabaseModalFunc();
}

function renderDatabaseTable() {
    applyFilters();
}

function applyFilters() {
    // Controlli di sicurezza
    if (!databaseSearchInput || !typeFilter || !sortBy) {
        console.log('⏳ Elementi DOM non ancora disponibili, salto filtri');
        return;
    }
    
    let filteredPeppers = [...databasePeppers];
    
    // Filter by search term
    const searchTerm = databaseSearchInput.value.toLowerCase();
    if (searchTerm) {
        filteredPeppers = filteredPeppers.filter(pepper => 
            pepper.name.toLowerCase().includes(searchTerm) ||
            pepper.species.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by type
    const typeFilterValue = typeFilter.value;
    if (typeFilterValue === 'hybrid') {
        filteredPeppers = filteredPeppers.filter(pepper => pepper.isHybrid);
    } else if (typeFilterValue === 'nonhybrid') {
        filteredPeppers = filteredPeppers.filter(pepper => !pepper.isHybrid);
    }
    
    // Sort
    const sortValue = sortBy.value;
    switch(sortValue) {
        case 'date-desc':
            filteredPeppers.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
            break;
        case 'date-asc':
            filteredPeppers.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
            break;
        case 'name-asc':
            filteredPeppers.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredPeppers.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'species-asc':
            filteredPeppers.sort((a, b) => a.species.localeCompare(b.species));
            break;
    }
    
    renderFilteredDatabaseTable(filteredPeppers);
}

function renderFilteredDatabaseTable(filteredPeppers) {
    const tableBody = document.getElementById('databaseTableBody');
    tableBody.innerHTML = '';

    filteredPeppers.forEach(pepper => {
        const row = document.createElement('tr');
        
        const editBtn = `<button onclick="editDatabasePepper(${pepper.id})" class="btn-icon" title="Modifica"><i class="fas fa-edit"></i></button>`;
        const deleteBtn = `<button onclick="deleteDatabasePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina"><i class="fas fa-trash"></i></button>`;
        
        const typeClass = pepper.isHybrid ? 'type-hybrid' : 'type-normal';
        const typeText = pepper.isHybrid ? 'Hybrid' : 'Non Hybrid';
        
        row.innerHTML = `
            <td>${pepper.name}</td>
            <td>${pepper.species}</td>
            <td><span class="${typeClass}">${typeText}</span></td>
            <td>${pepper.motherPlantName || '-'}</td>
            <td>${pepper.fatherPlantName || '-'}</td>
            <td>${new Date(pepper.dateAdded).toLocaleDateString()}</td>
            <td class="actions">${editBtn}${deleteBtn}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function editDatabasePepper(id) {
    openDatabaseModal(id);
}

async function deleteDatabasePepper(id) {
    if (confirm('Sei sicuro di voler eliminare questo peperoncino dal database?')) {
        databasePeppers = databasePeppers.filter(p => p.id !== id);
        
        // Save to database
        try {
            await dbSync.saveData({
                databasePeppers: databasePeppers,
                lastUpdate: new Date().toISOString()
            });
            console.log('✅ Database pepper eliminato');
        } catch (error) {
            console.error('❌ Errore eliminazione database:', error);
        }
        
        renderDatabaseTable();
    }
}

function populateDatabaseForm(pepper) {
    document.getElementById('databasePepperName').value = pepper.name;
    document.getElementById('databasePepperSpecies').value = pepper.species;
    document.getElementById('isHybrid').checked = pepper.isHybrid;
    
    if (pepper.isHybrid) {
        hybridFields.style.display = 'block';
        updateParentSelects();
        setTimeout(() => {
            motherPlantSelect.value = pepper.motherPlant || '';
            fatherPlantSelect.value = pepper.fatherPlant || '';
        }, 100);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize database sync
        dbSync = new DatabaseSync();
        
        console.log('🚀 Avvio Database Page...');
        
        // Prima inizializza sidebar e DOM elements
        initSidebar();
        initDatabasePage();
        
        // POI inizializza il database
        await initDatabase();
        
        // Ora rendi la tabella con tutti gli elementi DOM pronti
        renderDatabaseTable();
        
        const isConnected = await dbSync.testConnection();
        if (isConnected) {
            console.log('🌐 Connesso al cloud database');
        } else {
            console.warn('⚠️ Modalità offline - usando dati locali database');
        }
    } catch (error) {
        console.error('❌ Errore avvio app database:', error);
    }
});
