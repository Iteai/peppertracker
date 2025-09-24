// Main application script with GitHub sync - NO SCOVILLE VERSION
let peppers = [];
let dbSync;

// Initialize database with GitHub sync - DEBUG VERSION
async function initDatabase() {
    try {
        console.log('🔄 Inizializzazione database...');
        
        dbSync = new GitHubSync();
        
        // Load data from GitHub with local fallback
        const data = await dbSync.loadData();
        
        console.log('📊 Raw data loaded from GitHub:', data);
        
        // Handle different data structures
        let loadedPeppers = [];
        
        if (data.peppers) {
            loadedPeppers = Array.isArray(data.peppers) ? data.peppers : [];
        } else if (Array.isArray(data)) {
            // Direct array format
            loadedPeppers = data;
        } else {
            loadedPeppers = [];
        }
        
        // Convert data structure for compatibility (NO SCOVILLE)
        peppers = loadedPeppers.map(pepper => ({
            id: pepper.id,
            name: pepper.name,
            type: pepper.species || pepper.type || 'Non specificato',
            origin: pepper.origin || 'Non specificato',
            description: pepper.description || '',
            dateAdded: pepper.dateAdded || new Date().toISOString(),
            stage: pepper.stage || null,
            height: pepper.height || null,
            isHybrid: pepper.isHybrid || false,
            varieties: pepper.varieties || [],
            crossings: pepper.crossings || []
        }));
        
        console.log('✅ Database inizializzato con GitHub:', peppers.length, 'peperoncini');
        console.log('📋 Loaded peppers:', peppers);
        
        // Update displays - with safety checks
        safeRenderTable();
        updateStats();
        
        // Initialize chart only if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            initChart();
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        
        // Robust fallback
        try {
            const localData = dbSync?.loadFromLocal() || {};
            console.log('📊 Local fallback data:', localData);
            
            let fallbackPeppers = [];
            if (localData.peppers) {
                fallbackPeppers = Array.isArray(localData.peppers) ? localData.peppers : [];
            }
            
            peppers = fallbackPeppers;
        } catch (localError) {
            console.error('❌ Errore anche nel caricamento locale:', localError);
            peppers = []; // Ultimate fallback
        }
        
        safeRenderTable();
        updateStats();
        
        return { peppers: peppers };
    }
}

// Test GitHub connection
async function testConnection() {
    try {
        console.log('🧪 Testing GitHub connection...');
        
        // Test by trying to load peppers only
        const testResult = await dbSync.loadFileFromGitHub('data/peppers.json');
        
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.innerHTML = '✅ GitHub connesso';
            statusElement.className = 'status connected';
        }
        
        console.log('✅ GitHub connection successful');
        return true;
        
    } catch (error) {
        console.error('❌ GitHub connection failed:', error);
        
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.innerHTML = '❌ GitHub offline';
            statusElement.className = 'status disconnected';
        }
        
        return false;
    }
}

// Save data with GitHub sync
async function saveData() {
    try {
        const currentData = dbSync.loadFromLocal();
        await dbSync.saveData({
            ...currentData,
            peppers: peppers,
            lastUpdate: new Date().toISOString()
        });
        
        console.log('✅ Data saved to GitHub');
        updateStats();
        
    } catch (error) {
        console.error('❌ Error saving to GitHub:', error);
        throw error;
    }
}

// Global error handling
window.addEventListener('error', function(e) {
    console.error('Errore globale:', e.error);
});

// DOM Elements
const hamburgerMenu = document.getElementById('hamburgerMenu');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('closeBtn');
const container = document.querySelector('.container');
const peppersTableBody = document.getElementById('peppersTableBody');
const searchInput = document.getElementById('searchInput');
const addPepperBtn = document.getElementById('addPepperBtn');
const pepperModal = document.getElementById('pepperModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const pepperForm = document.getElementById('pepperForm');
const modalTitle = document.getElementById('modalTitle');
const lightIntensity = document.getElementById('lightIntensity');
const lightValue = document.getElementById('lightValue');

// Chart variables
let plantChart;
const chartType = document.getElementById('chartType');
const timeRange = document.getElementById('timeRange');

// Sidebar functionality
function initSidebar() {
    if (!hamburgerMenu || !sidebar) return;
    
    hamburgerMenu.addEventListener('click', function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        container.classList.add('shifted');
        hamburgerMenu.style.display = 'none';
    });

    closeBtn?.addEventListener('click', closeSidebar);
    overlay?.addEventListener('click', closeSidebar);

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        container.classList.remove('shifted');
        hamburgerMenu.style.display = 'block';
    }
}

// Table functionality
function initTable() {
    if (addPepperBtn) {
        addPepperBtn.addEventListener('click', function() {
            openModal();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTable(this.value);
        });
    }
}

// Safe render table with array validation
function safeRenderTable() {
    try {
        if (!Array.isArray(peppers)) {
            console.warn('⚠️ Peppers is not an array, converting:', peppers);
            peppers = [];
        }
        renderTable();
    } catch (error) {
        console.error('❌ Error in renderTable:', error);
        peppers = [];
        renderTable();
    }
}

// Render peppers table - NO SCOVILLE VERSION
function renderTable() {
    const tableBody = document.getElementById('peppersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Safety check
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    peppers.forEach(pepper => {
        const row = document.createElement('tr');
        
        // Create action buttons
        const editBtn = `<button onclick="editPepper(${pepper.id})" class="btn-icon" title="Modifica">
            <i class="fas fa-edit"></i>
        </button>`;
        
        const deleteBtn = `<button onclick="deletePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina">
            <i class="fas fa-trash"></i>
        </button>`;

        // Format date properly
        let formattedDate = '-';
        if (pepper.dateAdded) {
            try {
                const date = new Date(pepper.dateAdded);
                formattedDate = date.toLocaleDateString('it-IT');
            } catch (e) {
                formattedDate = pepper.dateAdded;
            }
        }

        // ⬅️ REMOVED: Scoville column completely
        row.innerHTML = `
            <td class="pepper-name">${pepper.name || 'Senza nome'}</td>
            <td class="pepper-type">${pepper.type || '-'}</td>
            <td class="pepper-origin">${pepper.origin || '-'}</td>
            <td class="pepper-date">${formattedDate}</td>
            <td class="pepper-actions">
                ${editBtn}
                ${deleteBtn}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    updateStats();
}

// Filter table
function filterTable(searchTerm) {
    const tableBody = document.getElementById('peppersTableBody');
    if (!tableBody) return;
    
    const rows = tableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const isVisible = text.includes(searchTerm.toLowerCase());
        row.style.display = isVisible ? '' : 'none';
    });
}

// Modal functionality - NO SCOVILLE VERSION
function openModal(pepper = null) {
    const modal = document.getElementById('pepperModal');
    const form = document.getElementById('pepperForm');
    const title = document.getElementById('modalTitle');
    
    if (!modal || !form) {
        console.error('❌ Modal or form not found');
        return;
    }
    
    if (pepper) {
        // Edit mode
        if (title) title.textContent = 'Modifica Peperoncino';
        form.dataset.editId = pepper.id;
        
        // Safe populate form with null checks (NO SCOVILLE)
        const nameField = document.getElementById('pepperName');
        const typeField = document.getElementById('pepperType');
        const originField = document.getElementById('pepperOrigin');
        const descriptionField = document.getElementById('pepperDescription');
        
        if (nameField) nameField.value = pepper.name || '';
        if (typeField) typeField.value = pepper.type || '';
        if (originField) originField.value = pepper.origin || '';
        if (descriptionField) descriptionField.value = pepper.description || '';
        
    } else {
        // Add mode
        if (title) title.textContent = 'Aggiungi Peperoncino';
        form.removeAttribute('data-edit-id');
        form.reset();
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModalFunction() {
    const modal = document.getElementById('pepperModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Edit pepper
function editPepper(id) {
    const pepper = peppers.find(p => p.id === id);
    if (pepper) {
        openModal(pepper);
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
        await saveData();
        safeRenderTable();
        console.log('✅ Pepper deleted');
    } catch (error) {
        // Restore on error
        peppers = originalPeppers;
        safeRenderTable();
        alert('❌ Errore durante l\'eliminazione. Riprova.');
    }
}

// Form submission - NO SCOVILLE VERSION
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const editId = e.target.dataset.editId;
    
    // Safe form data extraction with null checks (NO SCOVILLE)
    const pepperName = formData.get('pepperName');
    const pepperType = formData.get('pepperType');
    const pepperOrigin = formData.get('pepperOrigin');
    const pepperDescription = formData.get('pepperDescription');
    
    const pepperData = {
        id: editId ? parseInt(editId) : Date.now(),
        name: pepperName ? pepperName.trim() : '',
        type: pepperType ? pepperType.trim() : '',
        origin: pepperOrigin ? pepperOrigin.trim() : '',
        description: pepperDescription ? pepperDescription.trim() : '',
        dateAdded: editId ? 
            peppers.find(p => p.id == editId)?.dateAdded || new Date().toISOString() : 
            new Date().toISOString(),
        lastModified: new Date().toISOString(),
        isHybrid: false,
        varieties: [],
        crossings: []
    };
    
    if (!pepperData.name) {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }
    
    try {
        // Ensure peppers is array
        if (!Array.isArray(peppers)) {
            peppers = [];
        }
        
        if (editId) {
            // Update existing
            const index = peppers.findIndex(p => p.id == editId);
            if (index !== -1) {
                peppers[index] = pepperData;
            }
        } else {
            // Add new
            peppers.unshift(pepperData);
        }
        
        await saveData();
        safeRenderTable();
        closeModalFunction();
        
        console.log('✅ Pepper saved:', pepperData.name);
        
    } catch (error) {
        alert('❌ Errore durante il salvataggio. Riprova.');
        console.error('Save error:', error);
    }
}

// Update statistics
function updateStats() {
    // Safety checks
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    // Total peppers
    const totalElement = document.getElementById('totalPeppers');
    if (totalElement) {
        totalElement.textContent = peppers.length;
    }
    
    // Unique types
    const typesElement = document.getElementById('totalVarieties');
    if (typesElement) {
        const types = new Set(peppers.filter(p => p.type).map(p => p.type));
        typesElement.textContent = types.size;
    }
    
    // Hybrids count
    const hybridsElement = document.getElementById('hybridCount');
    if (hybridsElement) {
        const hybrids = peppers.filter(p => p.isHybrid).length;
        hybridsElement.textContent = hybrids;
    }
    
    // Last update
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const localData = dbSync?.loadFromLocal() || {};
        if (localData.lastUpdate) {
            const date = new Date(localData.lastUpdate);
            lastUpdateElement.textContent = date.toLocaleDateString('it-IT');
        } else {
            lastUpdateElement.textContent = 'Mai';
        }
    }
    
    // Recent peppers
    showRecentPeppers();
    
    // System status
    showSystemStatus();
}

// Show recent peppers - NO SCOVILLE VERSION
function showRecentPeppers() {
    const recentElement = document.getElementById('recentPeppers');
    if (!recentElement) return;
    
    // Safety check
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    const recent = [...peppers]
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 5);
    
    if (recent.length === 0) {
        recentElement.innerHTML = `
            <div class="no-recent">
                <i class="fas fa-pepper-hot"></i>
                <p>Nessun peperoncino ancora aggiunto</p>
                <button onclick="window.location.href='database.html'" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Aggiungi il primo
                </button>
            </div>
        `;
        return;
    }
    
    // ⬅️ REMOVED: Scoville display from recent peppers
    recentElement.innerHTML = recent.map(pepper => `
        <div class="recent-item">
            <div class="recent-info">
                <h4>${pepper.name || 'Senza nome'}</h4>
                <p>${pepper.type || 'Tipo non specificato'}</p>
                ${pepper.isHybrid ? '<span class="hybrid-badge">Ibrido</span>' : ''}
            </div>
            <div class="recent-meta">
                <span class="date">${new Date(pepper.dateAdded).toLocaleDateString('it-IT')}</span>
            </div>
        </div>
    `).join('');
}

// Show system status
function showSystemStatus() {
    const statusElement = document.getElementById('systemStatus');
    if (!statusElement) return;
    
    const localData = dbSync?.loadFromLocal() || {};
    const hasLocal = Object.keys(localData).length > 0;
    
    statusElement.innerHTML = `
        <div class="status-item">
            <i class="fas fa-database"></i>
            <span>Locale: ${hasLocal ? '✅ OK' : '❌ Vuoto'}</span>
        </div>
        <div class="status-item">
            <i class="fab fa-github"></i>
            <span id="connectionStatus">GitHub: 🔄 Test...</span>
        </div>
        <div class="status-item">
            <i class="fas fa-clock"></i>
            <span>Sync: ${localData.lastUpdate ? 
                new Date(localData.lastUpdate).toLocaleString('it-IT') : 'Mai'}</span>
        </div>
    `;
    
    // Test connection
    testConnection();
}

// Initialize chart - Growth chart
function initChart() {
    const chartCanvas = document.getElementById('plantChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;
    
    // Destroy existing chart
    if (plantChart) {
        plantChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Safety check
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    // Monthly growth chart
    const monthlyData = {};
    peppers.forEach(pepper => {
        const date = new Date(pepper.dateAdded);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label]);
    
    plantChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Peperoncini Aggiunti',
                data: data,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#444'
                    }
                },
                y: {
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#444'
                    }
                }
            }
        }
    });
}

// Initialize app
async function initApp() {
    try {
        console.log('🚀 Avvio Pepper Tracker...');
        
        // Initialize components
        initSidebar();
        initTable();
        
        // Setup form handler
        const form = document.getElementById('pepperForm');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
        
        // Setup modal close handlers
        closeModal?.addEventListener('click', closeModalFunction);
        cancelBtn?.addEventListener('click', closeModalFunction);
        
        // Setup light intensity slider
        if (lightIntensity && lightValue) {
            lightIntensity.addEventListener('input', function() {
                lightValue.textContent = this.value + '%';
            });
        }
        
        // Load database
        await initDatabase();
        
        console.log('✅ Pepper Tracker avviato con successo');
        
    } catch (error) {
        console.error('❌ Errore avvio app tracker:', error);
        
        // Show error to user
        const container = document.querySelector('.container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-banner';
            errorDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Errore di inizializzazione: ${error.message}</span>
                <button onclick="location.reload()" class="btn-sm">Riprova</button>
            `;
            container.prepend(errorDiv);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('pepperModal');
    if (e.target === modal) {
        closeModalFunction();
    }
});

// Export functions for global access
window.initDatabase = initDatabase;
window.testConnection = testConnection;
window.saveData = saveData;
window.editPepper = editPepper;
window.deletePepper = deletePepper;
