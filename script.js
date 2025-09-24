// Main application script - LOCAL ONLY VERSION - SINGLE CHART
let peppers = [];
let plantChart; // UN SOLO GRAFICO

// Initialize database - LOCAL ONLY
function initDatabase() {
    try {
        console.log('🔄 Inizializzazione database locale...');
        
        const data = loadFromLocal();
        peppers = Array.isArray(data.peppers) ? data.peppers : [];
        
        console.log('✅ Database locale inizializzato:', peppers.length, 'peperoncini');
        
        renderTable();
        updateStats();
        
        if (typeof Chart !== 'undefined') {
            initChart();
            setupChartControls(); // ⬅️ Setup del menu a tendina
        }
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        peppers = [];
        renderTable();
        updateStats();
    }
}

// Save/Load functions (unchanged)
function saveToLocal(data) {
    try {
        localStorage.setItem('pepperTracker', JSON.stringify(data));
        console.log('💾 Saved to local storage');
    } catch (error) {
        console.error('❌ Local storage error:', error);
    }
}

function loadFromLocal() {
    try {
        const data = localStorage.getItem('pepperTracker');
        return data ? JSON.parse(data) : { peppers: [] };
    } catch (error) {
        console.error('❌ Local storage load error:', error);
        return { peppers: [] };
    }
}

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

// Sidebar functionality (unchanged)
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

// ⬅️ SETUP DEL MENU A TENDINA
function setupChartControls() {
    const chartTypeSelect = document.getElementById('chartType');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            updateChart(this.value);
        });
    }
}

// ⬅️ INIZIALIZZA GRAFICO SINGOLO
function initChart() {
    const chartCanvas = document.getElementById('plantChart');
    if (!chartCanvas) return;
    
    // Destroy existing chart
    if (plantChart) {
        plantChart.destroy();
    }
    
    // Start with height chart (default)
    updateChart('height');
}

// ⬅️ AGGIORNA GRAFICO BASATO SUL TIPO SELEZIONATO
function updateChart(type) {
    const chartCanvas = document.getElementById('plantChart');
    if (!chartCanvas) return;
    
    // Destroy existing chart
    if (plantChart) {
        plantChart.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    switch(type) {
        case 'height':
            createHeightChart(ctx);
            break;
        case 'stage':
            createStageChart(ctx);
            break;
        case 'light':
            createLightChart(ctx);
            break;
        case 'nutrients':
            createNutrientsChart(ctx);
            break;
        default:
            createHeightChart(ctx);
    }
}

// ⬅️ GRAFICO ALTEZZE
function createHeightChart(ctx) {
    const plantsWithHeight = peppers.filter(p => p.height && p.height > 0);
    
    if (plantsWithHeight.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nessun dato altezza disponibile', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const labels = plantsWithHeight.map(p => p.name);
    const heights = plantsWithHeight.map(p => p.height);
    
    plantChart = new Chart(ctx, {
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
                title: { display: true, text: 'Confronto Altezze Piante', color: '#e0e0e0' },
                legend: { labels: { color: '#e0e0e0' } }
            },
            scales: {
                x: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } },
                y: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } }
            }
        }
    });
}

// ⬅️ GRAFICO STATI
function createStageChart(ctx) {
    const stageData = {};
    peppers.forEach(pepper => {
        const stage = pepper.stage || 'Non specificato';
        stageData[stage] = (stageData[stage] || 0) + 1;
    });
    
    plantChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(stageData),
            datasets: [{
                data: Object.values(stageData),
                backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Stati delle Piante', color: '#e0e0e0' },
                legend: { labels: { color: '#e0e0e0' } }
            }
        }
    });
}

// ⬅️ GRAFICO LUCE
function createLightChart(ctx) {
    const plantsWithLight = peppers.filter(p => p.light);
    
    if (plantsWithLight.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nessun dato luce disponibile', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const labels = plantsWithLight.map(p => p.name);
    const lightData = plantsWithLight.map(p => p.light);
    
    plantChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Intensità Luce (%)',
                data: lightData,
                borderColor: '#ffeaa7',
                backgroundColor: 'rgba(255, 234, 167, 0.2)',
                pointBackgroundColor: '#ffeaa7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Intensità Luce per Pianta', color: '#e0e0e0' },
                legend: { labels: { color: '#e0e0e0' } }
            },
            scales: {
                r: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } }
            }
        }
    });
}

// ⬅️ GRAFICO NUTRIENTI
function createNutrientsChart(ctx) {
    const fertilizerData = {};
    peppers.forEach(pepper => {
        if (pepper.fertilizers && pepper.fertilizers.length > 0) {
            pepper.fertilizers.forEach(fert => {
                fertilizerData[fert] = (fertilizerData[fert] || 0) + 1;
            });
        }
    });
    
    if (Object.keys(fertilizerData).length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#888';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Nessun dato fertilizzanti disponibile', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    plantChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(fertilizerData),
            datasets: [{
                label: 'Utilizzo Fertilizzanti',
                data: Object.values(fertilizerData),
                backgroundColor: '#4ecdc4',
                borderColor: '#2c2c2c',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Uso Fertilizzanti', color: '#e0e0e0' },
                legend: { labels: { color: '#e0e0e0' } }
            },
            scales: {
                x: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } },
                y: { ticks: { color: '#e0e0e0' }, grid: { color: '#444' } }
            }
        }
    });
}

// Rest of the functions (renderTable, addPepper, etc.) remain the same...
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

function addPepper() {
    const form = document.getElementById('pepperForm');
    if (!form) {
        alert('❌ Form non trovato!');
        return;
    }
    
    const formData = new FormData(form);
    const name = formData.get('name');
    
    if (!name || name.trim() === '') {
        alert('⚠️ Nome del peperoncino richiesto!');
        return;
    }
    
    const pepperData = {
        id: Date.now(),
        name: name.trim(),
        species: formData.get('species')?.trim() || '',
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        dateAdded: new Date().toISOString(),
        stage: formData.get('stage') || '',
        height: formData.get('height') ? parseFloat(formData.get('height')) : null,
        light: formData.get('light') ? parseInt(formData.get('light')) : 50,
        waterType: formData.get('waterType') || '',
        fertilizers: Array.from(formData.getAll('fertilizers')),
        fertilizerAmount: formData.get('fertilizerAmount') ? parseFloat(formData.get('fertilizerAmount')) : null,
        lastModified: new Date().toISOString()
    };
    
    try {
        peppers.unshift(pepperData);
        saveData();
        renderTable();
        closeModal();
        form.reset();
        
        const lightValue = document.getElementById('lightValue');
        if (lightValue) lightValue.textContent = '50%';
        
        // Update chart with current type
        const chartType = document.getElementById('chartType').value;
        updateChart(chartType);
        
        console.log('✅ Pepper added:', pepperData.name);
        
    } catch (error) {
        peppers.shift();
        alert('❌ Errore durante il salvataggio. Riprova.');
        console.error('Save error:', error);
    }
}

function editPepper(id) {
    const pepper = peppers.find(p => p.id === id);
    if (!pepper) return;
    
    const name = prompt('Nome:', pepper.name);
    if (name === null) return;
    
    pepper.name = name.trim() || pepper.name;
    pepper.lastModified = new Date().toISOString();
    
    try {
        saveData();
        renderTable();
        
        const chartType = document.getElementById('chartType').value;
        updateChart(chartType);
        
        console.log('✅ Pepper updated:', pepper.name);
    } catch (error) {
        alert('❌ Errore durante l\'aggiornamento. Riprova.');
    }
}

function deletePepper(id) {
    if (!confirm('🗑️ Sei sicuro di voler eliminare questo peperoncino?')) {
        return;
    }
    
    const originalPeppers = [...peppers];
    peppers = peppers.filter(p => p.id !== id);
    
    try {
        saveData();
        renderTable();
        
        const chartType = document.getElementById('chartType').value;
        updateChart(chartType);
        
        console.log('✅ Pepper deleted');
    } catch (error) {
        peppers = originalPeppers;
        renderTable();
        alert('❌ Errore durante l\'eliminazione. Riprova.');
    }
}

function updateStats() {
    if (!Array.isArray(peppers)) {
        peppers = [];
    }
    
    const totalElement = document.querySelector('.stat-card .stat-value');
    if (totalElement) {
        totalElement.textContent = peppers.length;
    }
}

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

function updateLightValue(value) {
    const lightValue = document.getElementById('lightValue');
    if (lightValue) {
        lightValue.textContent = value + '%';
    }
}

function initApp() {
    try {
        console.log('🚀 Avvio Pepper Tracker - LOCAL MODE...');
        
        initSidebar();
        initDatabase();
        
        const form = document.getElementById('pepperForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                addPepper();
            });
        }
        
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

document.addEventListener('DOMContentLoaded', initApp);

window.addEventListener('click', function(e) {
    const modal = document.getElementById('pepperModal');
    if (e.target === modal) {
        closeModal();
    }
});

window.addPepper = addPepper;
window.editPepper = editPepper;
window.deletePepper = deletePepper;
window.openModal = openModal;
window.closeModal = closeModal;
window.updateLightValue = updateLightValue;
