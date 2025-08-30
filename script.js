const svg = document.getElementById('network-container');
const graphLayer = document.getElementById('graph-layer');
const nodeNameInput = document.getElementById('node-name');
const nodeInfoInput = document.getElementById('node-info');
const nodeColorInput = document.getElementById('node-color');
const nodeSizeInput = document.getElementById('node-size');
const addContactBtn = document.getElementById('add-contact-btn');
const connectBtn = document.getElementById('connect-btn');
const renameBtn = document.getElementById('rename-btn');
const recolorNodeBtn = document.getElementById('recolor-node-btn');
const clearBtn = document.getElementById('clear-btn');
const fitBtn = document.getElementById('fit-btn');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const toggleModeBtn = document.getElementById('toggle-mode-btn');

const infoPopup = document.getElementById('info-popup');
const popupName = document.getElementById('popup-name');
const popupInfo = document.getElementById('popup-info');
const closePopupBtn = document.getElementById('close-popup-btn');


let nodes = [];
let links = [];

let activeNode = null;
let dragStartCoords = { x: 0, y: 0 };
let nodeStartPos = { x: 0, y: 0 };

const sizeMultiplier = 8;

let connectingMode = false;
let renamingMode = false;
let recoloringNodeMode = false;
let isViewMode = false;

let panZoomInstance = null;

let history = [];
let historyIndex = -1;

function saveState() {
    // Clear any "forward" history
    history = history.slice(0, historyIndex + 1);
    
    // Save a deep copy of the current state
    history.push({
        nodes: JSON.parse(JSON.stringify(nodes)),
        links: JSON.parse(JSON.stringify(links))
    });

    historyIndex++;

    // Optional: Limit history size
    if (history.length > 20) {
        history.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const previousState = history[historyIndex];
        nodes = JSON.parse(JSON.stringify(previousState.nodes));
        links = JSON.parse(JSON.stringify(previousState.links));
        drawNetwork();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const nextState = history[historyIndex];
        nodes = JSON.parse(JSON.stringify(nextState.nodes));
        links = JSON.parse(JSON.stringify(nextState.links));
        drawNetwork();
    }
}


function createNode(name, x, y, color, size, info, parentId = null) {
    const node = {
        id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: name,
        x: x,
        y: y,
        color: color,
        size: size,
        info: info,
    };
    nodes.push(node);

    if (parentId) {
        links.push({
            sourceId: parentId,
            targetId: node.id
        });
    }

    drawNetwork();
    saveState();
}

function drawNetwork() {
    graphLayer.innerHTML = '';

    links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.sourceId);
        const targetNode = nodes.find(n => n.id === link.targetId);
        if (sourceNode && targetNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('class', 'link');
            line.setAttribute('x1', sourceNode.x);
            line.setAttribute('y1', sourceNode.y);
            line.setAttribute('x2', targetNode.x);
            line.setAttribute('y2', targetNode.y);
            line.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteLink(link.sourceId, link.targetId);
            });
            graphLayer.appendChild(line);
        }
    });

    nodes.forEach(node => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node');
        g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        g.setAttribute('data-id', node.id);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', node.size * sizeMultiplier);
        circle.setAttribute('fill', node.color);
        g.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = node.name.length > 5 ? node.name.substring(0, 5) + '...' : node.name;
        g.appendChild(text);

        g.addEventListener('mousedown', startDrag);
        g.addEventListener('click', handleNodeClick);
        g.addEventListener('contextmenu', deleteNode);
        
        graphLayer.appendChild(g);
    });
}

function startDrag(event) {
    event.stopPropagation();
    
    if (connectingMode || renamingMode || recoloringNodeMode || isViewMode) {
        return;
    }
    
    const target = event.currentTarget;
    const nodeId = target.getAttribute('data-id');
    activeNode = nodes.find(n => n.id === nodeId);
    
    if (activeNode) {
        const svgRect = svg.getBoundingClientRect();
        dragStartCoords.x = event.clientX - svgRect.left;
        dragStartCoords.y = event.clientY - svgRect.top;
        
        nodeStartPos.x = activeNode.x;
        nodeStartPos.y = activeNode.y;
        
        svg.addEventListener('mousemove', drag);
        svg.addEventListener('mouseup', endDrag);
        
        svg.style.cursor = 'grabbing';
    }
}

function drag(event) {
    if (activeNode) {
        const svgRect = svg.getBoundingClientRect();
        const newX = event.clientX - svgRect.left;
        const newY = event.clientY - svgRect.top;
        
        const dx = newX - dragStartCoords.x;
        const dy = newY - dragStartCoords.y;
        
        activeNode.x = nodeStartPos.x + dx;
        activeNode.y = nodeStartPos.y + dy;
        
        drawNetwork();
    }
}

function endDrag() {
    activeNode = null;
    svg.removeEventListener('mousemove', drag);
    svg.removeEventListener('mouseup', endDrag);
    svg.style.cursor = 'grab';
    saveState();
}

function handleNodeClick(event) {
    event.stopPropagation();
    if (activeNode) return;
    
    if (isViewMode) {
        const clickedNodeId = event.currentTarget.getAttribute('data-id');
        const node = nodes.find(n => n.id === clickedNodeId);
        if (node) {
            displayNodeInfo(node);
        }
    } else if (recoloringNodeMode) {
        recolorNode(event);
    } else if (renamingMode) {
        renameNode(event);
    } else if (connectingMode) {
        handleConnectingMode(event);
    } else {
        addNodeToNode(event);
    }
}

function displayNodeInfo(node) {
    popupName.textContent = node.name;
    popupInfo.textContent = node.info;
    infoPopup.classList.remove('hidden');
}

function hideNodeInfo() {
    infoPopup.classList.add('hidden');
}

function addNodeToNode(event) {
    const clickedNodeId = event.currentTarget.getAttribute('data-id');
    const parentNode = nodes.find(n => n.id === clickedNodeId);
    
    if (parentNode) {
        const name = prompt("Enter a name for the new contact:");
        
        if (name && name.trim()) {
            const newX = parentNode.x + Math.random() * 100 - 50;
            const newY = parentNode.y + Math.random() * 100 - 50;
            const color = nodeColorInput.value;
            const size = nodeSizeInput.value;
            const info = nodeInfoInput.value.trim();
            
            createNode(name.trim(), newX, newY, color, size, info, parentId = parentNode.id);
            nodeInfoInput.value = '';
        }
    }
}

function deleteNode(event) {
    event.preventDefault();

    if (!confirm("Are you sure you want to delete this node? This will also remove any connected links.")) {
        return;
    }
    
    const target = event.currentTarget;
    const nodeIdToDelete = target.getAttribute('data-id');
    
    nodes = nodes.filter(node => node.id !== nodeIdToDelete);
    
    links = links.filter(link => 
        link.sourceId !== nodeIdToDelete && link.targetId !== nodeIdToDelete
    );
    
    drawNetwork();
    saveState();
}

function deleteLink(sourceId, targetId) {
    if (confirm("Are you sure you want to delete this link?")) {
        links = links.filter(link => 
            !(link.sourceId === sourceId && link.targetId === targetId)
        );
        drawNetwork();
        saveState();
    }
}

let firstNodeToConnect = null;

function handleConnectingMode(event) {
    const clickedNodeId = event.currentTarget.getAttribute('data-id');
    
    if (!firstNodeToConnect) {
        firstNodeToConnect = clickedNodeId;
        alert("First node selected. Now click the second node to connect.");
    } else if (firstNodeToConnect === clickedNodeId) {
        alert("Cannot connect a node to itself. Please select a different node.");
    } else {
        links.push({
            sourceId: firstNodeToConnect,
            targetId: clickedNodeId
        });
        
        drawNetwork();
        connectingMode = false;
        connectBtn.textContent = 'Connect Nodes';
        firstNodeToConnect = null;
        saveState();
    }
}

function recolorNode(event) {
    const nodeId = event.currentTarget.getAttribute('data-id');
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        node.color = nodeColorInput.value;
        drawNetwork();
        saveState();
    }
    recoloringNodeMode = false;
    recolorNodeBtn.textContent = 'Recolor Node';
}

function renameNode(event) {
    const nodeIdToRename = event.currentTarget.getAttribute('data-id');
    const nodeToRename = nodes.find(n => n.id === nodeIdToRename);
    
    if (nodeToRename) {
        const newName = prompt("Enter a new name for the contact:", nodeToRename.name);
        if (newName !== null && newName.trim() !== '') {
            nodeToRename.name = newName.trim();
            const newInfo = prompt("Enter new info for the contact:", nodeToRename.info);
            if (newInfo !== null) {
                nodeToRename.info = newInfo.trim();
            }
            drawNetwork();
            saveState();
        }
    }
    renamingMode = false;
    renameBtn.textContent = 'Rename Node';
}


function clearWeb() {
    if (confirm("Are you sure you want to clear the entire web? This cannot be undone.")) {
        nodes = [];
        links = [];
        drawNetwork();
        const defaultColor = "#007bff";
        const defaultSize = 5;
        const defaultInfo = "This is the central node of your web.";
        createNode('Central Node', svg.clientWidth / 2, svg.clientHeight / 2, defaultColor, defaultSize, defaultInfo);

        if (panZoomInstance) {
            panZoomInstance.resetZoom();
            panZoomInstance.center();
        }
        saveState();
    }
}

function toggleMode() {
    isViewMode = !isViewMode;
    toggleModeBtn.textContent = isViewMode ? 'Design Mode' : 'View Mode';
    
    // Hide all design-related controls in view mode
    const controls = document.getElementById('controls');
    controls.querySelectorAll('button, input, textarea, label').forEach(element => {
        if (element.id !== 'toggle-mode-btn') {
            element.style.display = isViewMode ? 'none' : 'initial';
        }
    });

    // Also disable pan-zoom in view mode to avoid conflicts with clicking
    if (isViewMode) {
        panZoomInstance.disablePan();
        panZoomInstance.disableZoom();
    } else {
        panZoomInstance.enablePan();
        panZoomInstance.enableZoom();
    }
}


// Event Listeners for Buttons
addContactBtn.addEventListener('click', () => {
    const name = nodeNameInput.value.trim();
    const info = nodeInfoInput.value.trim();
    if (name) {
        const x = nodes.length === 0 ? svg.clientWidth / 2 : Math.random() * (svg.clientWidth - 200) + 100;
        const y = nodes.length === 0 ? svg.clientHeight / 2 : Math.random() * (svg.clientHeight - 200) + 100;
        const color = nodeColorInput.value;
        const size = nodeSizeInput.value;
        createNode(name, x, y, color, size, info);
        nodeNameInput.value = '';
        nodeInfoInput.value = '';
    }
});


connectBtn.addEventListener('click', () => {
    connectingMode = !connectingMode;
    connectBtn.textContent = connectingMode ? 'Cancel' : 'Connect Nodes';
    if(connectingMode) {
        renamingMode = false;
        renameBtn.textContent = 'Rename Node';
        recoloringNodeMode = false;
        recolorNodeBtn.textContent = 'Recolor Node';
    }
});

recolorNodeBtn.addEventListener('click', () => {
    recoloringNodeMode = !recoloringNodeMode;
    recolorNodeBtn.textContent = recoloringNodeMode ? 'Cancel' : 'Recolor Node';
    if(recoloringNodeMode) {
        connectingMode = false;
        connectBtn.textContent = 'Connect Nodes';
        renamingMode = false;
        renameBtn.textContent = 'Rename Node';
    }
});

renameBtn.addEventListener('click', () => {
    renamingMode = !renamingMode;
    renameBtn.textContent = renamingMode ? 'Cancel' : 'Rename Node';
    if(renamingMode) {
        connectingMode = false;
        connectBtn.textContent = 'Connect Nodes';
        recoloringNodeMode = false;
        recolorNodeBtn.textContent = 'Recolor Node';
    }
});

clearBtn.addEventListener('click', clearWeb);
fitBtn.addEventListener('click', () => {
    if (panZoomInstance) {
        panZoomInstance.resetZoom();
        panZoomInstance.center();
    }
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
toggleModeBtn.addEventListener('click', toggleMode);
closePopupBtn.addEventListener('click', hideNodeInfo);


window.addEventListener('load', () => {
    if (nodes.length === 0) {
        const defaultColor = "#007bff";
        const defaultSize = 5;
        const defaultInfo = "This is the central node of your web.";
        createNode('Central Node', svg.clientWidth / 2, svg.clientHeight / 2, defaultColor, defaultSize, defaultInfo);
        saveState();
    }
    
    panZoomInstance = svgPanZoom('#network-container', {
        zoomEnabled: true,
        panEnabled: true,
        dblClickZoomEnabled: false,
        mouseWheelZoomEnabled: true,
        controlIconsEnabled: true,
        fit: false,
        center: false
    });
});