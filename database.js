// Database management - VERSIONE CORRETTA CON SYNC
let databasePeppers = [];
let dbSync;

// Initialize database
async function initDatabase() {
    try {
        console.log('🌶️ Inizializzazione database peperoncini...');

        dbSync = new DatabaseSync();

        // Load data from localStorage/cloud
        const data = await dbSync.loadData();
        databasePeppers = data.databasePeppers || [];

        console.log('✅ Database inizializzato:', databasePeppers.length, 'varietà');

    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        const localData = dbSync?.loadFromLocal() || {};
        databasePeppers = localData.databasePeppers || [];
    }
}

// Save database peppers
async function saveDatabasePeppers() {
    try {
        const currentData = dbSync.loadFromLocal();
        await dbSync.saveData({
            ...currentData,
            databasePeppers: databasePeppers,
            lastUpdate: new Date().toISOString()
        });

        console.log('✅ Database salvato');

    } catch (error) {
        console.error('❌ Error saving database:', error);
        throw error;
    }
}

// Add pepper to database - VERSIONE CORRETTA
async function addDatabasePepper() {
    const name = document.getElementById('databasePepperName').value.trim();
    const species = document.getElementById('databasePepperSpecies').value;
    const isHybrid = document.getElementById('isHybrid').checked;
    const motherPlant = document.getElementById('motherPlant').value;
    const fatherPlant = document.getElementById('fatherPlant').value;

    if (!name) {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }

    if (!species) {
        alert('⚠️ Specie richiesta!');
        return;
    }

    // Trova nomi genitori se ibrido
    let motherPlantName = null;
    let fatherPlantName = null;

    if (isHybrid) {
        const mother = databasePeppers.find(p => p.id == motherPlant);
        const father = databasePeppers.find(p => p.id == fatherPlant);
        motherPlantName = mother ? mother.name : null;
        fatherPlantName = father ? father.name : null;
    }

    const pepper = {
        id: Date.now(),
        name: name,
        species: species,
        isHybrid: isHybrid,
        motherPlant: isHybrid ? motherPlant : null,
        fatherPlant: isHybrid ? fatherPlant : null,
        motherPlantName: motherPlantName,
        fatherPlantName: fatherPlantName,
        dateAdded: new Date().toISOString()
    };

    databasePeppers.push(pepper);

    try {
        await saveDatabasePeppers();

        // Reset form & close modal
        document.getElementById('databaseForm').reset();
        closeDatabaseModal();

        // Update display
        displayDatabasePeppers();

        console.log('✅ Varietà aggiunta:', pepper.name);

    } catch (error) {
        databasePeppers.pop();
        alert('❌ Errore durante il salvataggio. Riprova.');
    }
}

// Display database peppers in table
function displayDatabasePeppers() {
    const tbody = document.getElementById('databaseTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (databasePeppers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #888; padding: 40px;">
                    <i class="fas fa-database" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    Nessuna varietà nel database. Aggiungi la prima!
                </td>
            </tr>
        `;
        return;
    }

    // Apply current filters
    let filteredPeppers = applyCurrentFilters();

    filteredPeppers.forEach(pepper => {
        const row = document.createElement('tr');

        const typeLabel = pepper.isHybrid ?
            '<span class="type-hybrid">Hybrid</span>' :
            '<span class="type-normal">Pure</span>';

        const formattedDate = new Date(pepper.dateAdded).toLocaleDateString('it-IT');

        row.innerHTML = `
            <td class="pepper-name">${pepper.name}</td>
            <td class="pepper-species">${pepper.species || '-'}</td>
            <td class="pepper-type">${typeLabel}</td>
            <td class="pepper-mother">${pepper.motherPlantName || '-'}</td>
            <td class="pepper-father">${pepper.fatherPlantName || '-'}</td>
            <td class="pepper-date">${formattedDate}</td>
            <td class="pepper-actions">
                <button onclick="editDatabasePepper(${pepper.id})" class="btn-icon" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteDatabasePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Apply current filters
function applyCurrentFilters() {
    const searchTerm = document.getElementById('databaseSearchInput')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    const sortBy = document.getElementById('sortBy')?.value || 'date-desc';

    let filteredPeppers = [...databasePeppers];

    // Search filter
    if (searchTerm) {
        filteredPeppers = filteredPeppers.filter(pepper =>
            pepper.name.toLowerCase().includes(searchTerm) ||
            pepper.species?.toLowerCase().includes(searchTerm)
        );
    }

    // Type filter
    if (typeFilter === 'hybrid') {
        filteredPeppers = filteredPeppers.filter(pepper => pepper.isHybrid);
    } else if (typeFilter === 'nonhybrid') {
        filteredPeppers = filteredPeppers.filter(pepper => !pepper.isHybrid);
    }

    // Sort
    switch (sortBy) {
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
            filteredPeppers.sort((a, b) => (a.species || '').localeCompare(b.species || ''));
            break;
    }

    return filteredPeppers;
}

// Filter change handler
function onFilterChange() {
    displayDatabasePeppers();
}

// Edit database pepper
async function editDatabasePepper(id) {
    const pepper = databasePeppers.find(p => p.id === id);
    if (!pepper) return;

    const name = prompt('Nome:', pepper.name);
    if (name === null) return;

    pepper.name = name.trim() || pepper.name;
    pepper.lastModified = new Date().toISOString();

    try {
        await saveDatabasePeppers();
        displayDatabasePeppers();
        populateParentSelectors();
    } catch (error) {
        alert('❌ Errore durante l\'aggiornamento. Riprova.');
    }
}

// Delete database pepper
async function deleteDatabasePepper(id) {
    if (!confirm('🗑️ Sei sicuro di voler eliminare questa varietà?')) {
        return;
    }

    const originalPeppers = [...databasePeppers];
    databasePeppers = databasePeppers.filter(p => p.id !== id);

    try {
        await saveDatabasePeppers();
        displayDatabasePeppers();
        populateParentSelectors();
    } catch (error) {
        databasePeppers = originalPeppers;
        alert('❌ Errore durante l\'eliminazione. Riprova.');
    }
}

// Populate parent selectors for hybrid form
function populateParentSelectors() {
    const motherSelect = document.getElementById('motherPlant');
    const fatherSelect = document.getElementById('fatherPlant');

    if (!motherSelect || !fatherSelect) return;

    // Clear and repopulate
    motherSelect.innerHTML = '<option value="">Seleziona pianta madre</option>';
    fatherSelect.innerHTML = '<option value="">Seleziona pianta padre</option>';

    databasePeppers.forEach(pepper => {
        const option1 = document.createElement('option');
        option1.value = pepper.id;
        option1.textContent = `${pepper.name} (${pepper.species})`;
        motherSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = pepper.id;
        option2.textContent = `${pepper.name} (${pepper.species})`;
        fatherSelect.appendChild(option2);
    });
}

// Modal functions
function openDatabaseModal() {
    const modal = document.getElementById('databaseModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        populateParentSelectors();
    }
}

function closeDatabaseModal() {
    const modal = document.getElementById('databaseModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialize sidebar
function initSidebar() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('closeBtn');
    const container = document.querySelector('.container');

    if (!hamburgerMenu || !sidebar) return;

    hamburgerMenu.addEventListener('click', function () {
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

// Initialize hybrid checkbox toggle
function initHybridToggle() {
    const isHybridCheckbox = document.getElementById('isHybrid');
    const hybridFields = document.getElementById('hybridFields');

    if (isHybridCheckbox && hybridFields) {
        isHybridCheckbox.addEventListener('change', function () {
            hybridFields.style.display = this.checked ? 'block' : 'none';
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('🌶️ Avvio Database Page...');

        initSidebar();
        initHybridToggle();
        await initDatabase();
        displayDatabasePeppers();
        populateParentSelectors();

        // Setup form submission
        const form = document.getElementById('databaseForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                addDatabasePepper();
            });
        }

        // Add pepper button
        const addBtn = document.getElementById('addDatabasePepperBtn');
        if (addBtn) {
            addBtn.addEventListener('click', openDatabaseModal);
        }

        // Close modal buttons
        document.getElementById('closeDatabaseModal')?.addEventListener('click', closeDatabaseModal);
        document.getElementById('cancelDatabaseBtn')?.addEventListener('click', closeDatabaseModal);

        // Filter listeners
        document.getElementById('databaseSearchInput')?.addEventListener('input', onFilterChange);
        document.getElementById('typeFilter')?.addEventListener('change', onFilterChange);
        document.getElementById('sortBy')?.addEventListener('change', onFilterChange);

        // Click outside modal to close
        window.addEventListener('click', function (e) {
            const modal = document.getElementById('databaseModal');
            if (e.target === modal) {
                closeDatabaseModal();
            }
        });

        console.log('✅ Database page inizializzata');

    } catch (error) {
        console.error('❌ Errore inizializzazione pagina database:', error);
    }
});

// Export functions for global use
window.editDatabasePepper = editDatabasePepper;
window.deleteDatabasePepper = deleteDatabasePepper;
window.openDatabaseModal = openDatabaseModal;
window.closeDatabaseModal = closeDatabaseModal;
