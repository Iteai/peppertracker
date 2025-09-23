async function initDatabase() {
    try {
        console.log('🔄 Inizializzazione database...');
        
        // Prima carica dai dati locali se esistono
        const localData = dbSync.loadFromLocal();
        peppers = localData.peppers || [];
        
        // Poi prova a sincronizzare con il cloud
        const data = await dbSync.sync();
        peppers = data.peppers || [];
        
        console.log('✅ Database inizializzato con', peppers.length, 'peperoncini');
        
        // Aggiorna solo la tabella, il grafico sarà aggiornato dopo initChart
        renderTable();
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database:', error);
        // Fallback ai dati locali
        const localData = dbSync.loadFromLocal();
        peppers = localData.peppers || [];
        renderTable();
    }
}

// Gestione errori globale
window.addEventListener('error', function(e) {
    console.error('Errore globale:', e.error);
});

// Sample data for peppers (in a real app, this would come from a database)
let peppers = [];

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

// Initialize database sync
let dbSync;

// Sidebar functionality
function initSidebar() {
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

// Table functionality
function initTable() {
    addPepperBtn.addEventListener('click', function() {
        openModal();
    });

    searchInput.addEventListener('input', function() {
        filterTable(this.value);
    });
}

function renderTable() {
    const tableBody = document.getElementById('peppersTableBody');
    tableBody.innerHTML = '';

    peppers.forEach(pepper => {
        const row = document.createElement('tr');
        
        // Create action buttons
        const editBtn = `<button onclick="editPepper(${pepper.id})" class="btn-icon" title="Modifica"><i class="fas fa-edit"></i></button>`;
        const deleteBtn = `<button onclick="deletePepper(${pepper.id})" class="btn-icon btn-danger" title="Elimina"><i class="fas fa-trash"></i></button>`;
        
        row.innerHTML = `
            <td>${pepper.name}</td>
            <td>${pepper.species}</td>
            <td>${new Date(pepper.dateAdded).toLocaleDateString()}</td>
            <td><span class="status-badge status-${pepper.stage}">${pepper.stage}</span></td>
            <td class="actions">${editBtn}${deleteBtn}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterTable(searchTerm) {
    const rows = peppersTableBody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row.cells[0].textContent.toLowerCase();
        const species = row.cells[1].textContent.toLowerCase();
        
        if (name.includes(searchTerm.toLowerCase()) || species.includes(searchTerm.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    }
}

// Chart functionality
function initChart() {
    const ctx = document.getElementById('plantChart').getContext('2d');

    // Update light value display
    lightIntensity.addEventListener('input', function() {
        lightValue.textContent = this.value + '%';
    });

    // Create initial chart
    plantChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: peppers.map(p => p.name),
            datasets: [{
                label: 'Altezza (cm)',
                data: peppers.map(p => p.height),
                borderColor: '#d9534f',
                backgroundColor: 'rgba(217, 83, 79, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
                }
            }
        }
    });

    // Add event listeners to chart controls
    chartType.addEventListener('change', updateChart);
    timeRange.addEventListener('change', updateChart);
    
    // Ora aggiorna il grafico con i dati attuali
    updateChart();
}

function updateChart() {
    // Controllo di sicurezza: se il grafico non è ancora inizializzato, esci
    if (!plantChart) {
        console.log('⏳ Grafico non ancora inizializzato, salto aggiornamento');
        return;
    }

    const type = chartType.value;
    const range = timeRange.value;

    let labels = peppers.map(p => p.name);
    let data;
    let label;
    let backgroundColor;

    switch(type) {
        case 'height':
            data = peppers.map(p => p.height);
            label = 'Altezza (cm)';
            backgroundColor = 'rgba(217, 83, 79, 0.1)';
            break;
        case 'stage':
            // Convert stages to numerical values for charting
            const stageValues = {
                'semina': 1, 'germinazione': 2, 'crescita': 3, 'fioritura': 4,
                'fruttificazione': 5, 'raccolta': 6, 'raccoltasemi': 7
            };
            data = peppers.map(p => stageValues[p.stage]);
            label = 'Stato della Pianta';
            backgroundColor = 'rgba(92, 184, 92, 0.1)';
            break;
        case 'light':
            data = peppers.map(p => p.light);
            label = 'Intensità Luce (%)';
            backgroundColor = 'rgba(240, 173, 78, 0.1)';
            break;
        case 'nutrients':
            // Use fertilizer amount as data
            data = peppers.map(p => p.fertilizerAmount);
            label = 'Quantità Fertilizzante (ml/L)';
            backgroundColor = 'rgba(91, 192, 222, 0.1)';
            break;
    }

    // Apply time range filter if needed
    if (range !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        if (range === 'week') {
            cutoffDate.setDate(now.getDate() - 7);
        } else if (range === 'month') {
            cutoffDate.setMonth(now.getMonth() - 1);
        }

        const filteredData = [];
        const filteredLabels = [];
        peppers.forEach((pepper, index) => {
            const pepperDate = new Date(pepper.dateAdded);
            if (pepperDate >= cutoffDate) {
                filteredData.push(data[index]);
                filteredLabels.push(labels[index]);
            }
        });
        data = filteredData;
        labels = filteredLabels;
    }

    // Update chart
    plantChart.data.labels = labels;
    plantChart.data.datasets[0].data = data;
    plantChart.data.datasets[0].label = label;
    plantChart.data.datasets[0].backgroundColor = backgroundColor;

    // Change border color based on data type for visual distinction
    switch(type) {
        case 'height':
            plantChart.data.datasets[0].borderColor = '#d9534f';
            break;
        case 'stage':
            plantChart.data.datasets[0].borderColor = '#5cb85c';
            break;
        case 'light':
            plantChart.data.datasets[0].borderColor = '#f0ad4e';
            break;
        case 'nutrients':
            plantChart.data.datasets[0].borderColor = '#5bc0de';
            break;
    }

    plantChart.update();
}

// Modal functionality
function initModal() {
    closeModal.addEventListener('click', closeModalFunc);
    cancelBtn.addEventListener('click', closeModalFunc);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === pepperModal) {
            closeModalFunc();
        }
    });

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('pepperDate').value = today;
}

function openModal(pepperId = null) {
    if (pepperId) {
        // Editing existing pepper
        const pepper = peppers.find(p => p.id === pepperId);
        if (pepper) {
            modalTitle.textContent = 'Modifica Peperoncino';
            populateForm(pepper);
            pepperForm.setAttribute('data-id', pepperId);
        }
    } else {
        // Adding new pepper
        modalTitle.textContent = 'Aggiungi Nuovo Peperoncino';
        pepperForm.reset();
        pepperForm.removeAttribute('data-id');
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('pepperDate').value = today;
        lightValue.textContent = '50%';
    }
    
    pepperModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModalFunc() {
    pepperModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    pepperForm.reset();
    pepperForm.removeAttribute('data-id');
}

function populateForm(pepper) {
    document.getElementById('pepperName').value = pepper.name;
    document.getElementById('pepperSpecies').value = pepper.species;
    document.getElementById('pepperDate').value = pepper.dateAdded;
    document.getElementById('plantStage').value = pepper.stage;
    document.getElementById('plantHeight').value = pepper.height;
    document.getElementById('lightIntensity').value = pepper.light;
    lightValue.textContent = pepper.light + '%';
    document.getElementById('waterType').value = pepper.waterType || 'rubinetto';
    document.getElementById('fertilizerAmount').value = pepper.fertilizerAmount || 0;
    
    // Set fertilizers checkboxes
    const fertilizerCheckboxes = document.querySelectorAll('input[name="fertilizer"]');
    fertilizerCheckboxes.forEach(checkbox => {
        checkbox.checked = pepper.fertilizers && pepper.fertilizers.includes(checkbox.value);
    });
}

// Event Listeners
function initEventListeners() {
    pepperForm.addEventListener('submit', function(e) {
        e.preventDefault();
        savePepper();
    });
}

function savePepper() {
    const name = document.getElementById('pepperName').value;
    const species = document.getElementById('pepperSpecies').value;
    const dateAdded = document.getElementById('pepperDate').value;
    const stage = document.getElementById('plantStage').value;
    const height = parseFloat(document.getElementById('plantHeight').value);
    const light = parseInt(document.getElementById('lightIntensity').value);
    const waterType = document.getElementById('waterType').value;
    const fertilizerAmount = parseFloat(document.getElementById('fertilizerAmount').value);

    // Get selected fertilizers
    const fertilizers = [];
    document.querySelectorAll('input[name="fertilizer"]:checked').forEach(checkbox => {
        fertilizers.push(checkbox.value);
    });

    const pepperId = pepperForm.getAttribute('data-id');
    
    if (pepperId) {
        // Update existing pepper
        const index = peppers.findIndex(p => p.id == parseInt(pepperId));
        if (index !== -1) {
            peppers[index] = {
                ...peppers[index],
                name,
                species,
                dateAdded,
                stage,
                height,
                light,
                waterType,
                fertilizers,
                fertilizerAmount
            };
        }
    } else {
        // Add new pepper
        const newPepper = {
            id: peppers.length > 0 ? Math.max(...peppers.map(p => p.id)) + 1 : 1,
            name,
            species,
            dateAdded: dateAdded,
            stage,
            height,
            light,
            waterType,
            fertilizers,
            fertilizerAmount
        };
        peppers.unshift(newPepper); // Add to beginning of array
    }

    // Salva SOLO nel tracker (non toccare il database)
    dbSync.saveData({
        peppers: peppers,
        lastUpdate: new Date().toISOString()
    }).then(() => {
        console.log('✅ Peperoncino tracker salvato');
    }).catch(error => {
        console.error('❌ Errore salvataggio tracker:', error);
    });

    // Update table and chart
    renderTable();
    updateChart();

    // Close modal
    closeModalFunc();
}

function editPepper(id) {
    openModal(id);
}

function deletePepper(id) {
    if (confirm('Sei sicuro di voler eliminare questo peperoncino?')) {
        peppers = peppers.filter(p => p.id !== id);
        
        // Salva nel tracker
        dbSync.saveData({
            peppers: peppers,
            lastUpdate: new Date().toISOString()
        }).then(() => {
            console.log('✅ Peperoncino tracker eliminato');
        }).catch(error => {
            console.error('❌ Errore eliminazione tracker:', error);
        });
        
        renderTable();
        updateChart();
    }
}

function addSyncButton() {
    const syncButton = document.createElement('button');
    syncButton.id = 'syncButton';
    syncButton.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizza';
    syncButton.className = 'sync-btn';
    
    const tableControls = document.querySelector('.table-controls');
    if (tableControls) {
        tableControls.appendChild(syncButton);
        
        syncButton.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizzando...';
            
            try {
                console.log('🔄 Peppers prima del sync:', peppers.length);
                const data = await dbSync.forceSync();
                peppers = data.peppers || [];
                console.log('🔄 Peppers dopo il sync:', peppers.length);
                renderTable();
                updateChart();
            } catch (error) {
                console.error('Errore sincronizzazione:', error);
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizza';
            }
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize database sync
        dbSync = new DatabaseSync();
        
        console.log('🚀 Avvio Pepper Tracker...');
        await initDatabase();
        initSidebar();
        initTable();
        initChart();
        initModal();
        initEventListeners();
        addSyncButton();
        
        const isConnected = await dbSync.testConnection();
        if (isConnected) {
            console.log('🌐 Connesso al cloud tracker');
        } else {
            console.warn('⚠️ Modalità offline - usando dati locali tracker');
        }
    } catch (error) {
        console.error('❌ Errore avvio app tracker:', error);
    }
});
