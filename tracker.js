// Tracker variables
let peppers = []; // Piante correnti (da index.html tracker)
let databasePeppers = []; // Varietà database (da database.html)
let trackerEntries = []; // Entry multiple per pianta
let dbSync, trackerSync;
let plantProgressChart, compareChart;

// DOM Elements
let hamburgerMenu, sidebar, overlay, closeBtn, container;
let selectedPlantSelect, addEntryBtn, metricTypeSelect, timeRangeSelect, compareBtn;
let entryModal, entryForm, compareModal;
let currentHeightSpan, avgGrowthSpan, dayTrackedSpan, currentStageSpan;

// Initialize databases
async function initDatabases() {
    try {
        console.log('📊 Inizializzazione Tracker databases...');
        
        // Inizializza sync per peppers (da index.html)
        dbSync = new DatabaseSync();
        const trackerData = dbSync.loadFromLocal();
        peppers = trackerData.peppers || [];
        
        // Sincronizza peppers tracker
        const syncedData = await dbSync.sync();
        peppers = syncedData.peppers || [];
        
        // Inizializza sync per database varieties
        const databaseSync = new DatabaseSync(); 
        const databaseData = databaseSync.loadFromLocal();
        databasePeppers = databaseData.databasePeppers || [];
        
        // Sincronizza database varieties
        const syncedDbData = await databaseSync.sync();
        databasePeppers = syncedDbData.databasePeppers || [];
        
        // Carica tracker entries (nuovo sistema)
        trackerEntries = trackerData.trackerEntries || [];
        
        console.log('✅ Tracker inizializzato:', {
            peppers: peppers.length,
            database: databasePeppers.length, 
            entries: trackerEntries.length
        });
        
    } catch (error) {
        console.error('❌ Errore inizializzazione Tracker:', error);
        // Fallback ai dati locali
        const localData = dbSync?.loadFromLocal() || {};
        peppers = localData.peppers || [];
        databasePeppers = localData.databasePeppers || [];
        trackerEntries = localData.trackerEntries || [];
    }
}

// Sidebar functionality
function initSidebar() {
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

// Initialize tracker page
function initTrackerPage() {
    // Get DOM elements
    selectedPlantSelect = document.getElementById('selectedPlant');
    addEntryBtn = document.getElementById('addEntryBtn');
    metricTypeSelect = document.getElementById('metricType');
    timeRangeSelect = document.getElementById('timeRange');
    compareBtn = document.getElementById('compareBtn');
    
    entryModal = document.getElementById('entryModal');
    entryForm = document.getElementById('entryForm');
    compareModal = document.getElementById('compareModal');
    
    currentHeightSpan = document.getElementById('currentHeight');
    avgGrowthSpan = document.getElementById('avgGrowth');
    dayTrackedSpan = document.getElementById('dayTracked');
    currentStageSpan = document.getElementById('currentStage');
    
    // Event listeners
    selectedPlantSelect.addEventListener('change', onPlantSelected);
    addEntryBtn.addEventListener('click', openEntryModal);
    metricTypeSelect.addEventListener('change', updateChart);
    timeRangeSelect.addEventListener('change', updateChart);
    compareBtn.addEventListener('click', openCompareModal);
    
    // Modal event listeners
    document.getElementById('closeEntryModal').addEventListener('click', closeEntryModal);
    document.getElementById('cancelEntryBtn').addEventListener('click', closeEntryModal);
    document.getElementById('closeCompareModal').addEventListener('click', closeCompareModal);
    entryForm.addEventListener('submit', saveEntry);
    
    // Today's date as default
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    
    // Initialize charts
    initCharts();
    
    // Populate plant selectors
    populatePlantSelectors();
}

// Populate plant selectors with combined data
function populatePlantSelectors() {
    // Clear existing options
    selectedPlantSelect.innerHTML = '<option value="">Scegli una pianta...</option>';
    
    // Add current peppers (from tracker)
    peppers.forEach(pepper => {
        const option = document.createElement('option');
        option.value = `pepper-${pepper.id}`;
        option.textContent = `${pepper.name} (Tracciata)`;
        option.setAttribute('data-source', 'pepper');
        option.setAttribute('data-id', pepper.id);
        selectedPlantSelect.appendChild(option);
    });
    
    // Add database varieties (non ancora tracciate)
    databasePeppers.forEach(dbPepper => {
        // Controlla se non è già tracciata
        const alreadyTracked = peppers.some(p => 
            p.name === dbPepper.name && p.species === dbPepper.species
        );
        
        if (!alreadyTracked) {
            const option = document.createElement('option');
            option.value = `database-${dbPepper.id}`;
            option.textContent = `${dbPepper.name} (Dal Database)`;
            option.setAttribute('data-source', 'database');
            option.setAttribute('data-id', dbPepper.id);
            selectedPlantSelect.appendChild(option);
        }
    });
    
    // Populate compare selectors
    populateCompareSelectors();
}

// Populate compare modal selectors
function populateCompareSelectors() {
    const comparePlant1 = document.getElementById('comparePlant1');
    const comparePlant2 = document.getElementById('comparePlant2');
    
    [comparePlant1, comparePlant2].forEach(select => {
        select.innerHTML = '<option value="">Seleziona...</option>';
        
        peppers.forEach(pepper => {
            const option = document.createElement('option');
            option.value = pepper.id;
            option.textContent = pepper.name;
            select.appendChild(option);
        });
    });
}

// Handle plant selection
function onPlantSelected() {
    const selectedValue = selectedPlantSelect.value;
    
    if (selectedValue) {
        addEntryBtn.disabled = false;
        const [source, id] = selectedValue.split('-');
        
        if (source === 'pepper') {
            // Existing tracked plant
            const pepper = peppers.find(p => p.id == id);
            loadPlantData(pepper, 'pepper');
        } else if (source === 'database') {
            // Database variety - create new tracked plant
            const dbPepper = databasePeppers.find(p => p.id == id);
            createNewTrackedPlant(dbPepper);
        }
    } else {
        addEntryBtn.disabled = true;
        clearPlantData();
    }
}

// Create new tracked plant from database variety
async function createNewTrackedPlant(dbPepper) {
    const newPepper = {
        id: peppers.length > 0 ? Math.max(...peppers.map(p => p.id)) + 1 : 1,
        name: dbPepper.name,
        species: dbPepper.species,
        dateAdded: new Date().toISOString().split('T')[0],
        stage: 'semina',
        height: 0,
        light: 50,
        waterType: 'rubinetto',
        fertilizers: [],
        fertilizerAmount: 0,
        // Reference to database variety
        databaseRef: dbPepper.id,
        isHybrid: dbPepper.isHybrid
    };
    
    peppers.unshift(newPepper);
    
    // Save to tracker database
    try {
        await dbSync.saveData({
            peppers: peppers,
            trackerEntries: trackerEntries,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Nuova pianta creata nel tracker');
        
        // Update selector
        populatePlantSelectors();
        
        // Select the new plant
        selectedPlantSelect.value = `pepper-${newPepper.id}`;
        loadPlantData(newPepper, 'pepper');
        
        // Auto-open entry modal for first entry
        openEntryModal();
        
    } catch (error) {
        console.error('❌ Errore creazione pianta tracker:', error);
    }
}

// Load plant data and update UI
function loadPlantData(pepper, source) {
    if (!pepper) return;
    
    console.log('📊 Caricando dati per:', pepper.name);
    
    // Get entries for this plant
    const plantEntries = trackerEntries.filter(entry => entry.pepperId === pepper.id);
    
    // Update stats
    updateQuickStats(pepper, plantEntries);
    
    // Update chart
    updateChart();
    
    // Update timeline
    updateTimeline(plantEntries);
}

// Update quick stats cards
function updateQuickStats(pepper, entries) {
    // Current height
    const latestEntry = entries.length > 0 ? 
        entries.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
    
    currentHeightSpan.textContent = latestEntry?.height ? 
        `${latestEntry.height} cm` : `${pepper.height} cm`;
    
    // Average growth
    if (entries.length >= 2) {
        const sortedEntries = entries
            .filter(e => e.height)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sortedEntries.length >= 2) {
            const firstHeight = sortedEntries[0].height;
            const lastHeight = sortedEntries[sortedEntries.length - 1].height;
            const firstDate = new Date(sortedEntries[0].date);
            const lastDate = new Date(sortedEntries[sortedEntries.length - 1].date);
            const daysDiff = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
            
            const avgGrowth = (lastHeight - firstHeight) / daysDiff;
            avgGrowthSpan.textContent = `${avgGrowth.toFixed(2)} cm/giorno`;
        } else {
            avgGrowthSpan.textContent = '-';
        }
    } else {
        avgGrowthSpan.textContent = '-';
    }
    
    // Days tracked
    if (entries.length > 0) {
        const dates = entries.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
        dayTrackedSpan.textContent = `${daysDiff} giorni`;
    } else {
        dayTrackedSpan.textContent = '-';
    }
    
    // Current stage
    const currentStage = latestEntry?.stage || pepper.stage || '-';
    currentStageSpan.textContent = currentStage.charAt(0).toUpperCase() + currentStage.slice(1);
}

// Clear plant data
function clearPlantData() {
    currentHeightSpan.textContent = '-';
    avgGrowthSpan.textContent = '-';
    dayTrackedSpan.textContent = '-';
    currentStageSpan.textContent = '-';
    
    document.getElementById('chartTitle').textContent = 'Seleziona una pianta per vedere i grafici';
    document.getElementById('totalEntries').textContent = '0 entry';
    document.getElementById('dateRange').textContent = '-';
    document.getElementById('growthRate').textContent = '-';
    
    if (plantProgressChart) {
        plantProgressChart.destroy();
        plantProgressChart = null;
    }
    
    updateTimeline([]);
}

// Initialize charts
function initCharts() {
    const ctx = document.getElementById('plantProgressChart').getContext('2d');
    
    plantProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Altezza (cm)',
                data: [],
                borderColor: '#d9534f',
                backgroundColor: 'rgba(217, 83, 79, 0.1)',
                tension: 0.1,
                fill: true,
                pointBackgroundColor: '#d9534f',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ccc'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ccc'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ccc'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(44, 44, 44, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#d9534f',
                    borderWidth: 1
                }
            }
        }
    });
}

// Update main chart
function updateChart() {
    if (!plantProgressChart) return;
    
    const selectedValue = selectedPlantSelect.value;
    if (!selectedValue) return;
    
    const [source, id] = selectedValue.split('-');
    const pepper = peppers.find(p => p.id == id);
    if (!pepper) return;
    
    const entries = trackerEntries.filter(entry => entry.pepperId === pepper.id);
    const metric = metricTypeSelect.value;
    const timeRange = timeRangeSelect.value;
    
    // Filter by time range
    let filteredEntries = [...entries];
    if (timeRange !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();
        
        if (timeRange === 'week') {
            cutoffDate.setDate(now.getDate() - 7);
        } else if (timeRange === 'month') {
            cutoffDate.setMonth(now.getMonth() - 1);
        }
        
        filteredEntries = entries.filter(entry => new Date(entry.date) >= cutoffDate);
    }
    
    // Sort by date
    filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Prepare chart data
    const labels = filteredEntries.map(entry => 
        new Date(entry.date).toLocaleDateString('it-IT', { 
            month: 'short', 
            day: 'numeric' 
        })
    );
    
    let data, label, color;
    
    switch(metric) {
        case 'height':
            data = filteredEntries.map(entry => entry.height || 0);
            label = 'Altezza (cm)';
            color = '#d9534f';
            break;
        case 'light':
            data = filteredEntries.map(entry => entry.light || 0);
            label = 'Luce (%)';
            color = '#f39c12';
            break;
        case 'fertilizer':
            data = filteredEntries.map(entry => entry.fertilizerAmount || 0);
            label = 'Fertilizzante (ml/L)';
            color = '#5bc0de';
            break;
        case 'stage':
            const stageValues = {
                'semina': 1, 'germinazione': 2, 'crescita': 3, 
                'fioritura': 4, 'fruttificazione': 5, 'raccolta': 6, 'raccoltasemi': 7
            };
            data = filteredEntries.map(entry => stageValues[entry.stage] || 0);
            label = 'Stato della Pianta';
            color = '#5cb85c';
            break;
    }
    
    // Update chart
    plantProgressChart.data.labels = labels;
    plantProgressChart.data.datasets[0].data = data;
    plantProgressChart.data.datasets[0].label = label;
    plantProgressChart.data.datasets[0].borderColor = color;
    plantProgressChart.data.datasets[0].backgroundColor = color + '20';
    plantProgressChart.data.datasets[0].pointBackgroundColor = color;
    
    plantProgressChart.update();
    
    // Update chart stats
    document.getElementById('chartTitle').textContent = `${pepper.name} - ${label}`;
    document.getElementById('totalEntries').textContent = `${filteredEntries.length} entry`;
    
    if (filteredEntries.length > 0) {
        const dates = filteredEntries.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('dateRange').textContent = 
            `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
        
        if (metric === 'height' && data.length >= 2) {
            const growth = data[data.length - 1] - data[0];
            const days = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24));
            document.getElementById('growthRate').textContent = 
                `+${(growth/days).toFixed(2)} cm/giorno`;
        } else {
            document.getElementById('growthRate').textContent = '-';
        }
    } else {
        document.getElementById('dateRange').textContent = '-';
        document.getElementById('growthRate').textContent = '-';
    }
}

// Update timeline
function updateTimeline(entries) {
    const timeline = document.getElementById('entriesTimeline');
    
    if (!entries || entries.length === 0) {
        timeline.innerHTML = '<div class="no-data">Nessuna entry trovata</div>';
        return;
    }
    
    // Sort entries by date (most recent first)
    const sortedEntries = entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    timeline.innerHTML = '';
    
    sortedEntries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'timeline-entry';
        
        const date = new Date(entry.date).toLocaleDateString('it-IT', {
            weekday: 'short',
            year: 'numeric',
            month: 'short', 
            day: 'numeric'
        });
        
        entryDiv.innerHTML = `
            <div class="timeline-date">${date}</div>
            <div class="timeline-content">
                <div class="timeline-metrics">
                    ${entry.height ? `<span class="metric">🌱 ${entry.height}cm</span>` : ''}
                    ${entry.light ? `<span class="metric">💡 ${entry.light}%</span>` : ''}
                    ${entry.fertilizerAmount ? `<span class="metric">🧪 ${entry.fertilizerAmount}ml/L</span>` : ''}
                    <span class="metric stage-${entry.stage}">🎯 ${entry.stage}</span>
                </div>
                ${entry.notes ? `<div class="timeline-notes">${entry.notes}</div>` : ''}
            </div>
            <div class="timeline-actions">
                <button onclick="editEntry(${entry.id})" class="btn-icon" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEntry(${entry.id})" class="btn-icon btn-danger" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        timeline.appendChild(entryDiv);
    });
}

// Modal functions
function openEntryModal() {
    const selectedValue = selectedPlantSelect.value;
    if (!selectedValue) return;
    
    document.getElementById('entryModalTitle').textContent = 'Nuova Entry';
    entryForm.reset();
    entryForm.removeAttribute('data-id');
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    
    entryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEntryModal() {
    entryModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openCompareModal() {
    compareModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCompareModal() {
    compareModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Save entry
async function saveEntry(e) {
    e.preventDefault();
    
    const selectedValue = selectedPlantSelect.value;
    if (!selectedValue) return;
    
    const [source, id] = selectedValue.split('-');
    const pepperId = parseInt(id);
    
    const entryData = {
        id: trackerEntries.length > 0 ? Math.max(...trackerEntries.map(e => e.id)) + 1 : 1,
        pepperId: pepperId,
        date: document.getElementById('entryDate').value,
        stage: document.getElementById('entryStage').value,
        height: parseFloat(document.getElementById('entryHeight').value) || null,
        light: parseInt(document.getElementById('entryLight').value) || null,
        fertilizerAmount: parseFloat(document.getElementById('entryFertilizer').value) || null,
        notes: document.getElementById('entryNotes').value.trim() || null,
        timestamp: new Date().toISOString()
    };
    
    trackerEntries.push(entryData);
    
    // Save to database
    try {
        await dbSync.saveData({
            peppers: peppers,
            trackerEntries: trackerEntries,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Entry salvata');
        
        // Update UI
        const pepper = peppers.find(p => p.id === pepperId);
        if (pepper) {
            loadPlantData(pepper, 'pepper');
        }
        
        closeEntryModal();
        
    } catch (error) {
        console.error('❌ Errore salvataggio entry:', error);
    }
}

// Edit entry
function editEntry(entryId) {
    const entry = trackerEntries.find(e => e.id === entryId);
    if (!entry) return;
    
    document.getElementById('entryModalTitle').textContent = 'Modifica Entry';
    
    document.getElementById('entryDate').value = entry.date;
    document.getElementById('entryStage').value = entry.stage;
    document.getElementById('entryHeight').value = entry.height || '';
    document.getElementById('entryLight').value = entry.light || '';
    document.getElementById('entryFertilizer').value = entry.fertilizerAmount || '';
    document.getElementById('entryNotes').value = entry.notes || '';
    
    entryForm.setAttribute('data-id', entryId);
    
    entryModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Delete entry
async function deleteEntry(entryId) {
    if (!confirm('Sei sicuro di voler eliminare questa entry?')) return;
    
    trackerEntries = trackerEntries.filter(e => e.id !== entryId);
    
    try {
        await dbSync.saveData({
            peppers: peppers,
            trackerEntries: trackerEntries,
            lastUpdate: new Date().toISOString()
        });
        console.log('✅ Entry eliminata');
        
        // Update UI
        const selectedValue = selectedPlantSelect.value;
        if (selectedValue) {
            const [source, id] = selectedValue.split('-');
            const pepper = peppers.find(p => p.id == id);
            if (pepper) {
                loadPlantData(pepper, 'pepper');
            }
        }
        
    } catch (error) {
        console.error('❌ Errore eliminazione entry:', error);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('📊 Avvio Tracker Page...');
        
        // Initialize components
        initSidebar();
        initTrackerPage();
        
        // Initialize databases
        await initDatabases();
        
        // Populate selectors with data
        populatePlantSelectors();
        
        console.log('✅ Tracker inizializzato con successo');
        
    } catch (error) {
        console.error('❌ Errore avvio Tracker app:', error);
    }
});
