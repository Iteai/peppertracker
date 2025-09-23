// Genealogy variables
let databasePeppers = [];
let dbSync;
let svg, g, simulation;
let nodes = [], links = [];
let currentFilters = { species: 'all', generation: 'all' };

// DOM Elements
let hamburgerMenu, sidebar, overlay, closeBtn, container;
let speciesFilter, generationFilter, resetZoomBtn, exportPDFBtn;
let infoPanel, infoTitle, infoContent, closeInfoBtn;

// Color scheme for generations
const colors = {
    f0: '#27ae60',      // Green - Pure varieties
    f1: '#f39c12',      // Orange - F1 hybrids  
    f2: '#e74c3c',      // Red - F2+ hybrids
    selected: '#9b59b6', // Purple - Selected node
    link: '#95a5a6'     // Gray - Links
};

// Initialize database
async function initDatabase() {
    try {
        console.log('🌳 Inizializzazione database genealogy...');
        
        const localData = dbSync.loadFromLocal();
        databasePeppers = localData.databasePeppers || [];
        
        const data = await dbSync.sync();
        databasePeppers = data.databasePeppers || [];
        
        console.log('✅ Database genealogy inizializzato con', databasePeppers.length, 'varietà');
        
    } catch (error) {
        console.error('❌ Errore inizializzazione database genealogy:', error);
        const localData = dbSync.loadFromLocal();
        databasePeppers = localData.databasePeppers || [];
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

// Initialize genealogy page
function initGenealogyPage() {
    // Get DOM elements
    speciesFilter = document.getElementById('speciesFilter');
    generationFilter = document.getElementById('generationFilter');
    resetZoomBtn = document.getElementById('resetZoom');
    exportPDFBtn = document.getElementById('exportPDF');
    infoPanel = document.getElementById('info-panel');
    infoTitle = document.getElementById('info-title');
    infoContent = document.getElementById('info-content');
    closeInfoBtn = document.getElementById('close-info');

    // Event listeners
    speciesFilter.addEventListener('change', onFilterChange);
    generationFilter.addEventListener('change', onFilterChange);
    resetZoomBtn.addEventListener('click', resetZoom);
    exportPDFBtn.addEventListener('click', exportToPDF);
    closeInfoBtn.addEventListener('click', closeInfoPanel);

    // Initialize SVG
    initSVG();
    
    // Build and render tree
    buildTreeData();
    renderTree();
}

// Initialize SVG canvas
function initSVG() {
    const container = d3.select('#genealogy-tree');
    const containerRect = container.node().getBoundingClientRect();
    const width = containerRect.width || 800;
    const height = 600;

    svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .call(d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', function(event) {
                g.attr('transform', event.transform);
            }));

    g = svg.append('g');

    // Add definitions for gradients and patterns
    const defs = svg.append('defs');
    
    // Gradient for nodes
    const gradient = defs.append('radialGradient')
        .attr('id', 'nodeGradient')
        .attr('cx', '30%')
        .attr('cy', '30%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#ffffff')
        .attr('stop-opacity', 0.8);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#000000')
        .attr('stop-opacity', 0.1);
}

// Build tree data structure
// Build tree data structure
function buildTreeData() {
    nodes = [];
    links = [];

    // Create nodes from database peppers
    databasePeppers.forEach(pepper => {
        const generation = calculateGeneration(pepper);
        
        nodes.push({
            id: pepper.id,
            name: pepper.name,
            species: pepper.species,
            isHybrid: pepper.isHybrid,
            motherPlant: pepper.motherPlant,
            fatherPlant: pepper.fatherPlant,
            motherPlantName: pepper.motherPlantName,
            fatherPlantName: pepper.fatherPlantName,
            generation: generation,
            color: getNodeColor(generation, pepper.isHybrid),
            dateAdded: pepper.dateAdded
        });
    });

    // Create a Set of valid node IDs for quick lookup
    const validNodeIds = new Set(nodes.map(node => node.id));

    // Create links from parent relationships - WITH VALIDATION
    databasePeppers.forEach(pepper => {
        if (pepper.isHybrid && pepper.motherPlant && pepper.fatherPlant) {
            // Check if both mother and father nodes exist
            const motherExists = validNodeIds.has(parseInt(pepper.motherPlant));
            const fatherExists = validNodeIds.has(parseInt(pepper.fatherPlant));
            const childExists = validNodeIds.has(pepper.id);

            if (motherExists && childExists) {
                // Link from mother to child
                links.push({
                    source: parseInt(pepper.motherPlant),
                    target: pepper.id,
                    type: 'mother'
                });
            } else {
                console.warn(`⚠️ Link madre non valido: madre=${pepper.motherPlant}, figlio=${pepper.id}`, {
                    motherExists, childExists
                });
            }
            
            if (fatherExists && childExists) {
                // Link from father to child
                links.push({
                    source: parseInt(pepper.fatherPlant),
                    target: pepper.id,
                    type: 'father'
                });
            } else {
                console.warn(`⚠️ Link padre non valido: padre=${pepper.fatherPlant}, figlio=${pepper.id}`, {
                    fatherExists, childExists
                });
            }
        }
    });

    console.log('🌳 Tree data built:', { 
        nodes: nodes.length, 
        links: links.length,
        nodeIds: nodes.map(n => n.id),
        linkSources: links.map(l => l.source),
        linkTargets: links.map(l => l.target)
    });
}


// Calculate generation level
function calculateGeneration(pepper) {
    if (!pepper.isHybrid) return 0; // F0 - Pure variety
    
    // For now, simple logic - can be enhanced for complex genealogies
    const motherGen = pepper.motherPlant ? getGenerationById(pepper.motherPlant) : 0;
    const fatherGen = pepper.fatherPlant ? getGenerationById(pepper.fatherPlant) : 0;
    
    return Math.max(motherGen, fatherGen) + 1;
}

// Get generation by ID
function getGenerationById(id) {
    const pepper = databasePeppers.find(p => p.id == id);
    if (!pepper) return 0;
    return calculateGeneration(pepper);
}

// Get node color based on generation
function getNodeColor(generation, isHybrid) {
    if (!isHybrid) return colors.f0;
    if (generation === 1) return colors.f1;
    return colors.f2;
}

// Filter change handler
function onFilterChange() {
    currentFilters.species = speciesFilter.value;
    currentFilters.generation = generationFilter.value;
    
    applyFilters();
    renderTree();
}

// Apply filters to nodes and links - SENZA MUTARE GLI ARRAY ORIGINALI
function applyFilters() {
    // Parti dai dati originali SEMPRE (non da nodes filtrati)
    const originalNodes = [];
    databasePeppers.forEach(pepper => {
        const generation = calculateGeneration(pepper);
        originalNodes.push({
            id: pepper.id,
            name: pepper.name,
            species: pepper.species,
            isHybrid: pepper.isHybrid,
            motherPlant: pepper.motherPlant,
            fatherPlant: pepper.fatherPlant,
            motherPlantName: pepper.motherPlantName,
            fatherPlantName: pepper.fatherPlantName,
            generation: generation,
            color: getNodeColor(generation, pepper.isHybrid),
            dateAdded: pepper.dateAdded,
            // Mantieni le posizioni se esistono
            x: nodes.find(n => n.id === pepper.id)?.x,
            y: nodes.find(n => n.id === pepper.id)?.y
        });
    });

    // Applica filtri su copia dei dati originali
    let filteredNodes = [...originalNodes];
    
    if (currentFilters.species !== 'all') {
        filteredNodes = filteredNodes.filter(node => 
            node.species === currentFilters.species
        );
    }
    
    if (currentFilters.generation !== 'all') {
        const targetGen = parseInt(currentFilters.generation);
        filteredNodes = filteredNodes.filter(node => {
            if (targetGen === 0) return node.generation === 0;
            if (targetGen === 1) return node.generation === 1;
            if (targetGen === 2) return node.generation === 2;
            if (targetGen === 3) return node.generation >= 3;
            return true;
        });
    }
    
    // Create set of visible node IDs
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Ricostruisci i link dai dati originali
    const originalLinks = [];
    databasePeppers.forEach(pepper => {
        if (pepper.isHybrid && pepper.motherPlant && pepper.fatherPlant) {
            const motherExists = visibleNodeIds.has(parseInt(pepper.motherPlant));
            const fatherExists = visibleNodeIds.has(parseInt(pepper.fatherPlant));
            const childExists = visibleNodeIds.has(pepper.id);

            if (motherExists && childExists) {
                originalLinks.push({
                    source: parseInt(pepper.motherPlant),
                    target: pepper.id,
                    type: 'mother'
                });
            }
            
            if (fatherExists && childExists) {
                originalLinks.push({
                    source: parseInt(pepper.fatherPlant),
                    target: pepper.id,
                    type: 'father'
                });
            }
        }
    });
    
    // Filtra link solo tra nodi visibili
    const filteredLinks = originalLinks.filter(link => {
        const sourceVisible = visibleNodeIds.has(link.source);
        const targetVisible = visibleNodeIds.has(link.target);
        return sourceVisible && targetVisible;
    });
    
    // Aggiorna gli array globali
    nodes = filteredNodes;
    links = filteredLinks;
    
    console.log('🔍 Filtri applicati:', {
        totalPeppers: databasePeppers.length,
        filteredNodes: nodes.length,
        filteredLinks: links.length,
        visibleIds: Array.from(visibleNodeIds)
    });
}

// Render the tree
function renderTree() {
    // Clear ALL previous content first
    g.selectAll('*').remove();
    
    if (nodes.length === 0) {
        // Show empty state
        g.append('text')
            .attr('x', 400)
            .attr('y', 300)
            .attr('text-anchor', 'middle')
            .attr('fill', '#ccc')
            .attr('font-size', '24px')
            .text('Nessuna varietà da visualizzare');
        return;
    }

    // Create force simulation - CON ATTRITO MAGGIORE
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(120)
            .strength(0.5)  // Ridotto per link più morbidi
        )
        .force('charge', d3.forceManyBody()
            .strength(-400)  // Aumentato per più spazio
        )
        .force('center', d3.forceCenter(400, 300))
        .force('collision', d3.forceCollide()
            .radius(40)  // Aumentato per evitare sovrapposizioni
            .strength(0.8)
        )
        .velocityDecay(0.7)  // CHIAVE: Aumenta attrito (default 0.4)
        .alphaDecay(0.05);   // Rallenta la simulazione più velocemente

    // Create links
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('.link')
        .data(links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('stroke', colors.link)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d => d.type === 'father' ? '5,5' : '0')
        .style('opacity', 0.7);

    // Create nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('.node')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
        .attr('r', 25)
        .attr('fill', d => d.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3)
        .style('filter', 'url(#nodeGradient)')
        .style('cursor', 'pointer');

    // Add text labels to nodes
    node.append('text')
        .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', 40)
        .attr('font-size', '12px')
        .attr('fill', '#ffffff')
        .attr('font-weight', 'bold')
        .attr('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
        .style('cursor', 'pointer');

    // Add generation labels
    node.append('text')
        .text(d => `F${d.generation}`)
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('font-size', '10px')
        .attr('fill', '#ffffff')
        .attr('font-weight', 'bold');

    // Add hover and click events
    node
        .on('mouseover', function(event, d) {
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 30)
                .attr('stroke-width', 4);
        })
        .on('mouseout', function(event, d) {
            if (d3.select(this).classed('selected')) return;
            
            d3.select(this).select('circle')
                .transition()
                .duration(200)
                .attr('r', 25)
                .attr('stroke-width', 3);
        })
        .on('click', function(event, d) {
            // Remove previous selection
            node.classed('selected', false)
                .select('circle')
                .attr('fill', n => n.color);
            
            // Add selection to clicked node
            d3.select(this)
                .classed('selected', true)
                .select('circle')
                .attr('fill', colors.selected);
                
            showInfoPanel(d);
        });

    // Update positions on each tick
    simulation.on('tick', function() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add zoom to fit
    setTimeout(() => {
        zoomToFit();
    }, 1000);
}

// Drag functions - CON SALVATAGGIO PERMANENTE
function dragstarted(event, d) {
    // Ferma completamente la simulazione
    simulation.stop();
    d.isDragging = true;
    
    // Salva la posizione di partenza per debug
    d.startX = d.x;
    d.startY = d.y;
}

function dragged(event, d) {
    // Aggiorna direttamente e PERMANENTEMENTE le coordinate del nodo
    d.x = event.x;
    d.y = event.y;
    
    // Aggiorna immediatamente la visualizzazione
    updatePositions();
}

function dragended(event, d) {
    d.isDragging = false;
    
    // IMPORTANTE: Salva definitivamente la nuova posizione
    d.x = event.x;
    d.y = event.y;
    
    // Rimuovi eventuali vincoli di posizione fissa
    delete d.fx;
    delete d.fy;
    
    console.log(`✅ Nodo ${d.name} spostato a: (${Math.round(d.x)}, ${Math.round(d.y)})`);
}

// Funzione per aggiornare solo le posizioni visuali - MIGLIORATA
function updatePositions() {
    // Aggiorna i links con controllo su source/target
    g.selectAll('.link')
        .attr('x1', d => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
            return source ? source.x : 0;
        })
        .attr('y1', d => {
            const source = typeof d.source === 'object' ? d.source : nodes.find(n => n.id === d.source);
            return source ? source.y : 0;
        })
        .attr('x2', d => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
            return target ? target.x : 0;
        })
        .attr('y2', d => {
            const target = typeof d.target === 'object' ? d.target : nodes.find(n => n.id === d.target);
            return target ? target.y : 0;
        });

    // Aggiorna i nodi
    g.selectAll('.node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
}


// Show info panel
function showInfoPanel(nodeData) {
    infoTitle.textContent = nodeData.name;
    
    const parentInfo = nodeData.isHybrid ? 
        `<p><strong>Madre:</strong> ${nodeData.motherPlantName || 'N/A'}</p>
         <p><strong>Padre:</strong> ${nodeData.fatherPlantName || 'N/A'}</p>` :
        '<p><strong>Varietà pura</strong></p>';
    
    infoContent.innerHTML = `
        <p><strong>Specie:</strong> ${nodeData.species}</p>
        <p><strong>Generazione:</strong> F${nodeData.generation}</p>
        <p><strong>Tipo:</strong> ${nodeData.isHybrid ? 'Ibrido' : 'Varietà Pura'}</p>
        ${parentInfo}
        <p><strong>Data Aggiunta:</strong> ${new Date(nodeData.dateAdded).toLocaleDateString()}</p>
    `;
    
    infoPanel.style.display = 'block';
}

// Close info panel
function closeInfoPanel() {
    infoPanel.style.display = 'none';
    
    // Remove selection
    g.selectAll('.node')
        .classed('selected', false)
        .select('circle')
        .attr('fill', d => d.color);
}

// Reset zoom
function resetZoom() {
    svg.transition()
        .duration(750)
        .call(
            d3.zoom().transform,
            d3.zoomIdentity
        );
}

// Zoom to fit all nodes
function zoomToFit() {
    if (nodes.length === 0) return;
    
    const bounds = g.node().getBBox();
    const parent = svg.node().getBoundingClientRect();
    const fullWidth = parent.width;
    const fullHeight = parent.height;
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;
    
    if (width == 0 || height == 0) return;
    
    const scale = Math.min(fullWidth / width, fullHeight / height) * 0.8;
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
    
    svg.transition()
        .duration(750)
        .call(
            d3.zoom().transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
}

// Export to PDF (placeholder - would need additional library)
function exportToPDF() {
    // For now, just show alert - would implement with jsPDF or similar
    alert('🚧 Funzionalità Export PDF in arrivo!\n\nPer ora puoi fare screenshot dell\'albero genealogico.');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize database sync
        dbSync = new DatabaseSync();
        
        console.log('🌳 Avvio Genealogy Page...');
        
        // Initialize components
        initSidebar();
        initGenealogyPage();
        
        // Load data
        await initDatabase();
        
        // Build and render tree (SOLO UNA VOLTA)
        if (databasePeppers.length > 0) {
            buildTreeData();
            renderTree();
        } else {
            // Se non ci sono dati, mostra messaggio
            g.selectAll('*').remove();
            g.append('text')
                .attr('x', 400)
                .attr('y', 300)
                .attr('text-anchor', 'middle')
                .attr('fill', '#ccc')
                .attr('font-size', '24px')
                .text('Aggiungi varietà ibride nel Database per vedere l\'albero');
        }
        
        const isConnected = await dbSync.testConnection();
        if (isConnected) {
            console.log('🌐 Connesso al cloud database genealogy');
        } else {
            console.warn('⚠️ Modalità offline - usando dati locali genealogy');
        }
    } catch (error) {
        console.error('❌ Errore avvio genealogy app:', error);
    }
});