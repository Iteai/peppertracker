// Main application script - LOCAL ONLY VERSION
let peppers = [];

// Initialize database - LOCAL ONLY
function initDatabase() {
    try {
        console.log('🔄 Inizializzazione database locale...');
        
        // Load only from localStorage
        const data = loadFromLocal();
        peppers = Array.isArray(data.peppers) ? data.peppers : [];
        
        console.log('✅ Database locale inizializzato:', peppers.length, 'peperoncini');
        
        // Update displays
        renderTable();
        updateStats();
        
        // Initialize chart
        if (typeof Chart !== 'undefined') {
            initChart();
        }
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        peppers = [];
        renderTable();
        updateStats();
    }
}

// Save to localStorage only
function saveToLocal(data) {
    try {
        localStorage.setItem('pepperTracker', JSON.stringify(data));
        console.log('💾 Saved to local storage');
    } catch (error) {
        console.error('❌ Local storage error:', error);
    }
}

// Load from localStorage only
function loadFromLocal() {
    try {
        const data = localStorage.getItem('pepperTracker');
        return data ? JSON.parse(data) : { peppers: [] };
    } catch (error) {
        console.error('❌ Local storage load error:', error);
        return { peppers: [] };
    }
}

// Save peppers - LOCAL ONLY
function saveData() {
    try {
        const data = {
            peppers: peppers,
            lastUpdate: new Date().toISOString()
        };
        saveToLocal(data);
        console.log('✅ Data saved locally');
        updateStats();
    } catch (error) {
        console.error('❌ Error saving data:', error);
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

// Chart variables
let plantChart;

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

// Render peppers table
function renderTable() {
    const tableBody = document.getElementById('peppersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!Array.isArray(peppers) || peppers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-peppers">
                    <i class="fas fa-pepper-hot"></i>
                    <p>Nessun peperoncino ancora aggiunto</p>
                </td>
            </tr>
        `;
        return;
    }
    
    peppers.forEach(pepper => {
        const row = document.createElement('tr');
        
        // Format date
        let formattedDate = '-';
        if (pepper.dateAdded) {
            try {
                const date = new Date(pepper.dateAdded);
                formattedDate = date.toLocaleDateString('it-IT');
            } catch (e) {
                formattedDate = pepper.dateAdded;
            }
        }

        row.innerHTML = `
            <td class="pepper-name">${pepper.name || 'Senza nome'}</td>
            <td class="pepper-species">${pepper.species || pepper.type || '-'}</td>
            <td class="pepper-date">${formattedDate}</td>
            <td class="pepper-stage">${pepper.stage || '-'}</td>
            <td class="pepper-actions">
                <button onclick="editPepper(${pepper.id})" class="btn-icon" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Add new pepper
function addPepper() {
    const form = document.getElementById('pepperForm');
    const formData = new FormData(form);
    
    const pepperData = {
        id: Date.now(),
        name: formData.get('name')?.trim() || '',
        species: formData.get('species')?.trim() || '',
        dateAdded: formData.get('date') || new Date().toISOString().split('T')[0],
        stage: formData.get('stage') || '',
        height: formData.get('height') ? parseFloat(formData.get('height')) : null,
        light: formData.get('light') ? parseInt(formData.get('light')) : 50,
        waterType: formData.get('waterType') || '',
        fertilizers: Array.from(formData.getAll('fertilizers')),
        fertilizerAmount: formData.get('fertilizerAmount') ? parseFloat(formData.get('fertilizerAmount')) : null,
        lastModified: new Date().toISOString()
    };
    
    if (!pepperData.name) {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }
    
    try {
        peppers.unshift(pepperData);
        saveData();
        renderTable();
        closeModal();
        form.reset();
        
        console.log('✅ Pepper added:', pepperData.name);
        
    } catch (error) {
        peppers.shift(); // Remove if save failed
        alert('❌ Errore durante il salvataggio. Riprova.');
        console.error('Save error:', error);
    }
}

// Edit pepper
function editPepper(id) {
    const pepper = peppers.find(p => p.id === id);
    if (!pepper) return;
    
    // Simple edit with prompts (you can enhance this with a modal)
    const name = prompt('Nome:', pepper.name);
    if (name === null) return;
    
    const species = prompt('Specie:', pepper.species);
    if (species === null) return;
    
    const stage = prompt('Stato (semina/germinazione/crescita/fioritura/fruttificazione/raccolta):', pepper.stage);
    if (stage === null) return;
    
    const height = prompt('Altezza (cm):', pepper.height || '');
    
    pepper.name = name.trim() || pepper.name;
    pepper.species = species.trim() || pepper.species;
    pepper.stage = stage.trim() || pepper.stage;
    pepper.height = height ? parseFloat(height) : null;
    pepper.lastModified = new Date().toISOString();
    
    try {
        saveData();
        renderTable();
        console.log('✅ Pepper updated:', pepper.name);
    } catch (error) {
        alert('❌ Errore durante l\'aggiornamento. Riprova.');
        console.error('Update error:', error);
    }
}

// Delete pepper
function deletePepper(id) {
    if (!confirm('🗑️ Sei sicuro di voler eliminare questo peperoncino?')) {
        return;
    }
    
    const originalPeppers = [...peppers];
    peppers = peppers.filter(p => p.id !== id);
    
    try {
        saveData();
        renderTable();
        console.log('✅ Pepper deleted');
    } catch (error) {
        peppers = originalPeppers;
        renderTable();
        alert('❌ Errore durante l\'eliminazione. Riprova.');
        console.error('Delete error:', error);
    }
}

// Update statistics
function updateStats() {
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    // Total peppers
    const totalElement = document.querySelector('.stat-card .stat-value');
    if (totalElement) {
        totalElement.textContent = peppers.length;
    }
    
    // Update chart
    if (typeof Chart !== 'undefined') {
        initChart();
    }
}

// Initialize chart
function initChart() {
    const chartCanvas = document.getElementById('plantChart');
    if (!chartCanvas || typeof Chart === 'undefined') return;
    
    // Destroy existing chart
    if (plantChart) {
        plantChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Stage distribution
    const stageData = {};
    peppers.forEach(pepper => {
        const stage = pepper.stage || 'Non specificato';
        stageData[stage] = (stageData[stage] || 0) + 1;
    });
    
    plantChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(stageData),
            datasets: [{
                label: 'Numero Piante',
                data: Object.values(stageData),
                backgroundColor: [
                    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', 
                    '#ffeaa7', '#dda0dd', '#98d8c8'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#e0e0e0'
                    }
                },
                y: {
                    ticks: {
                        color: '#e0e0e0'
                    }
                }
            }
        }
    });
}

// Modal functions
function openModal() {
    const modal = document.getElementById('pepperModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('pepperModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Light intensity slider
function updateLightValue(value) {
    const lightValue = document.getElementById('lightValue');
    if (lightValue) {
        lightValue.textContent = value + '%';
    }
}

// Initialize app
function initApp() {
    try {
        console.log('🚀 Avvio Pepper Tracker - LOCAL MODE...');
        
        // Initialize components
        initSidebar();
        initDatabase();
        
        // Setup form submission
        const form = document.getElementById('pepperForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                addPepper();
            });
        }
        
        // Setup modal handlers
        const addBtn = document.getElementById('addPepperBtn');
        if (addBtn) {
            addBtn.addEventListener('click', openModal);
        }
        
        const closeBtn = document.getElementById('closeModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // Setup light slider
        const lightSlider = document.getElementById('lightIntensity');
        if (lightSlider) {
            lightSlider.addEventListener('input', function() {
                updateLightValue(this.value);
            });
        }
        
        console.log('✅ Pepper Tracker LOCAL avviato con successo');
        
    } catch (error) {
        console.error('❌ Errore avvio app tracker:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Close modal when clicking outside
window.addEventListener('click', function(e) {
    const modal = document.getElementById('pepperModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Export functions for global access
window.addPepper = addPepper;
window.editPepper = editPepper;
window.deletePepper = deletePepper;
window.openModal = openModal;
window.closeModal = closeModal;
window.updateLightValue = updateLightValue;
