// Database management with GitHub sync
let peppers = [];
let dbSync;

// Initialize database with GitHub sync
async function initDatabase() {
    try {
        console.log('🌶️ Inizializzazione database peperoncini...');
        
        dbSync = new GitHubSync();
        
        // Load data with GitHub priority
        const data = await dbSync.loadData();
        peppers = data.peppers || [];
        
        console.log('✅ Database inizializzato con GitHub sync:', peppers.length, 'peppers');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        // Fallback to local data
        const localData = dbSync?.loadFromLocal() || {};
        peppers = localData.peppers || [];
    }
}

// Save peppers to GitHub
async function savePeppers() {
    try {
        const currentData = dbSync.loadFromLocal();
        await dbSync.saveData({
            ...currentData,
            peppers: peppers,
            lastUpdate: new Date().toISOString()
        });
        
        console.log('✅ Peppers saved to GitHub');
        
    } catch (error) {
        console.error('❌ Error saving peppers:', error);
        throw error;
    }
}

// Add pepper function
async function addPepper() {
    const name = document.getElementById('pepperName').value.trim();
    const type = document.getElementById('pepperType').value;
    const origin = document.getElementById('pepperOrigin').value.trim();
    const scoville = document.getElementById('pepperScoville').value;
    const description = document.getElementById('pepperDescription').value.trim();
    
    if (!name) {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }
    
    const pepper = {
        id: Date.now(),
        name: name,
        type: type,
        origin: origin,
        scoville: scoville ? parseInt(scoville) : null,
        description: description,
        dateAdded: new Date().toISOString(),
        varieties: [],
        crossings: []
    };
    
    peppers.push(pepper);
    
    try {
        await savePeppers();
        
        // Reset form
        document.getElementById('pepperForm').reset();
        
        // Update display
        displayPeppers();
        updateStats();
        
        console.log('✅ Pepper added:', pepper.name);
        
    } catch (error) {
        // Remove from array if save failed
        peppers.pop();
        alert('❌ Errore durante il salvataggio. Riprova.');
    }
}

// Display peppers
function displayPeppers() {
    const tbody = document.getElementById('peppersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const sortedPeppers = [...peppers].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedPeppers.forEach(pepper => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="pepper-name">${pepper.name}</td>
            <td class="pepper-type">${pepper.type || '-'}</td>
            <td class="pepper-origin">${pepper.origin || '-'}</td>
            <td class="pepper-scoville">${pepper.scoville ? pepper.scoville.toLocaleString() + ' SHU' : '-'}</td>
            <td class="pepper-actions">
                <button onclick="editPepper(${pepper.id})" class="btn-icon" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Edit pepper
async function editPepper(id) {
    const pepper = peppers.find(p => p.id === id);
    if (!pepper) return;
    
    const name = prompt('Nome:', pepper.name);
    if (name === null) return;
    
    const type = prompt('Tipo:', pepper.type);
    if (type === null) return;
    
    const origin = prompt('Origine:', pepper.origin);
    if (origin === null) return;
    
    const scoville = prompt('Scoville:', pepper.scoville || '');
    const description = prompt('Descrizione:', pepper.description);
    
    pepper.name = name.trim() || pepper.name;
    pepper.type = type.trim() || pepper.type;
    pepper.origin = origin.trim() || pepper.origin;
    pepper.scoville = scoville ? parseInt(scoville) : null;
    pepper.description = description?.trim() || pepper.description;
    pepper.lastModified = new Date().toISOString();
    
    try {
        await savePeppers();
        displayPeppers();
        updateStats();
    } catch (error) {
        alert('❌ Errore durante l\'aggiornamento. Riprova.');
    }
}

// Delete pepper
async function deletePepper(id) {
    if (!confirm('🗑️ Sei sicuro di voler eliminare questo peperoncino?')) {
        return;
    }
    
    const originalPeppers = [...peppers];
    peppers = peppers.filter(p => p.id !== id);
    
    try {
        await savePeppers();
        displayPeppers();
        updateStats();
    } catch (error) {
        peppers = originalPeppers;
        alert('❌ Errore durante l\'eliminazione. Riprova.');
    }
}

// Update statistics
function updateStats() {
    const totalCount = document.getElementById('totalPeppers');
    const typesCount = document.getElementById('uniqueTypes');
    const originsCount = document.getElementById('uniqueOrigins');
    const averageScoville = document.getElementById('averageScoville');
    
    if (totalCount) totalCount.textContent = peppers.length;
    
    if (typesCount) {
        const types = new Set(peppers.filter(p => p.type).map(p => p.type));
        typesCount.textContent = types.size;
    }
    
    if (originsCount) {
        const origins = new Set(peppers.filter(p => p.origin).map(p => p.origin));
        originsCount.textContent = origins.size;
    }
    
    if (averageScoville) {
        const peppersWithScoville = peppers.filter(p => p.scoville);
        if (peppersWithScoville.length > 0) {
            const avg = peppersWithScoville.reduce((sum, p) => sum + p.scoville, 0) / peppersWithScoville.length;
            averageScoville.textContent = Math.round(avg).toLocaleString() + ' SHU';
        } else {
            averageScoville.textContent = '-';
        }
    }
}

// Filter peppers
function filterPeppers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filteredPeppers = peppers;
    
    if (searchTerm) {
        filteredPeppers = filteredPeppers.filter(pepper => 
            pepper.name.toLowerCase().includes(searchTerm) ||
            pepper.origin?.toLowerCase().includes(searchTerm) ||
            pepper.description?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilter && typeFilter !== 'all') {
        filteredPeppers = filteredPeppers.filter(pepper => pepper.type === typeFilter);
    }
    
    displayFilteredPeppers(filteredPeppers);
}

// Display filtered peppers
function displayFilteredPeppers(filteredPeppers) {
    const tbody = document.getElementById('peppersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const sortedPeppers = [...filteredPeppers].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedPeppers.forEach(pepper => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="pepper-name">${pepper.name}</td>
            <td class="pepper-type">${pepper.type || '-'}</td>
            <td class="pepper-origin">${pepper.origin || '-'}</td>
            <td class="pepper-scoville">${pepper.scoville ? pepper.scoville.toLocaleString() + ' SHU' : '-'}</td>
            <td class="pepper-actions">
                <button onclick="editPepper(${pepper.id})" class="btn-icon" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize sidebar
function initSidebar() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('closeBtn');
    const container = document.querySelector('.container');
    
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    try {
        initSidebar();
        await initDatabase();
        displayPeppers();
        updateStats();
        
        // Setup form submission
        const form = document.getElementById('pepperForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                addPepper();
            });
        }
        
        // Setup search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', filterPeppers);
        }
        
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', filterPeppers);
        }
        
    } catch (error) {
        console.error('❌ Errore inizializzazione pagina database:', error);
    }
});
