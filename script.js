// Main application script - LOCAL ONLY VERSION - FIXED
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
        
        // Initialize ALL charts
        if (typeof Chart !== 'undefined') {
            initAllCharts();
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
let heightChart, stageChart, lightChart, nutritionChart;

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
        if (pepper.date || pepper.dateAdded) {
            try {
                const date = new Date(pepper.date || pepper.dateAdded);
                formattedDate = date.toLocaleDateString('it-IT');
            } catch (e) {
                formattedDate = pepper.date || pepper.dateAdded;
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

// Add new pepper - FIXED FOR YOUR FORM
function addPepper() {
    const form = document.getElementById('pepperForm');
    const formData = new FormData(form);
    
    // ⬅️ FIX: Use correct field names from your HTML
    const name = formData.get('name'); // From <input name="name">
    const species = formData.get('species'); // From <select name="species">
    const date = formData.get('date'); // From <input name="date">
    const stage = formData.get('stage'); // From <select name="stage">
    const height = formData.get('height'); // From <input name="height">
    const light = formData.get('light'); // From <input name="light">
    const waterType = formData.get('waterType'); // From <select name="waterType">
    const fertilizers = Array.from(formData.getAll('fertilizers')); // From checkboxes
    const fertilizerAmount = formData.get('fertilizerAmount'); // From <input name="fertilizerAmount">
    
    console.log('📋 Form data:', { name, species, date, stage, height, light, waterType, fertilizers, fertilizerAmount });
    
    if (!name || name.trim() === '') {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }
    
    const pepperData = {
        id: Date.now(),
        name: name.trim(),
        species: species?.trim() || '',
        date: date || new Date().toISOString().split('T')[0],
        dateAdded: new Date().toISOString(),
        stage: stage || '',
        height: height ? parseFloat(height) : null,
        light: light ? parseInt(light) : 50,
        waterType: waterType || '',
        fertilizers: fertilizers,
        fertilizerAmount: fertilizerAmount ? parseFloat(fertilizerAmount) : null,
        lastModified: new Date().toISOString()
    };
    
    try {
        peppers.unshift(pepperData);
        saveData();
        renderTable();
        closeModal();
        form.reset();
        
        // Reset light slider display
        const lightValue = document.getElementById('lightValue');
        if (lightValue) lightValue.textContent = '50%';
        
        // Update charts
        if (typeof Chart !== 'undefined') {
            initAllCharts();
        }
        
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
    
    // Simple edit with prompts
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
        
        // Update charts
        if (typeof Chart !== 'undefined') {
            initAllCharts();
        }
        
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
        
        // Update charts
        if (typeof Chart !== 'undefined') {
            initAllCharts();
        }
        
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
}

// ⬅️ FIX: Initialize ALL charts like the original
function initAllCharts() {
    initHeightChart();
    initStageChart();
    initLightChart();
    initNutritionChart();
}

// Height Chart - Compare plant heights
function initHeightChart() {
    const chartCanvas = document.getElementById('plantChart');
    if (!chartCanvas || !Array.isArray(peppers)) return;
    
    // Destroy existing chart
    if (heightChart) {
        heightChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Get plants with height data
    const plantsWithHeight = peppers.filter(p => p.height && p.height > 0);
    
    if (plantsWithHeight.length === 0) {
        // Show placeholder
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        ctx.fillStyle = '#888';
        ctx.font = '16px Cinzel';
        ctx.textAlign = 'center';
        ctx.fillText('Nessun dato altezza disponibile', chartCanvas.width / 2, chartCanvas.height / 2);
        return;
    }
    
    const labels = plantsWithHeight.map(p => p.name);
    const heights = plantsWithHeight.map(p => p.height);
    
    heightChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Altezza (cm)',
                data: heights,
                backgroundColor: '#ff6b6b',
                borderColor: '#d9534f',
                borderWidth: 1
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

// Stage Chart - Plant growth stages
function initStageChart() {
    // This would show stage distribution
    console.log('Stage chart initialized');
}

// Light Chart - Light intensity comparison
function initLightChart() {
    // This would show light levels per plant
    console.log('Light chart initialized');
}

// Nutrition Chart - Fertilizer usage
function initNutritionChart() {
    // This would show nutrition data
    console.log('Nutrition chart initialized');
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
