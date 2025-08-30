const svg = document.getElementById('network-container');
const addContactBtn = document.getElementById('add-contact-btn');
const contactNameInput = document.getElementById('contact-name');
const nodeColorInput = document.getElementById('node-color');
const nodeSizeInput = document.getElementById('node-size');
const connectBtn = document.getElementById('connect-btn');
const renameBtn = document.getElementById('rename-btn');
const clearBtn = document.getElementById('clear-btn');

let nodes = [];
let links = [];

let activeNode = null;
let dragStartCoords = { x: 0, y: 0 };
let nodeStartPos = { x: 0, y: 0 };

const sizeMultiplier = 8;

let connectingMode = false;
let renamingMode = false;

function createNode(name, x, y, color, size, parentId = null) {
    const node = {
        id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: name,
        x: x,
        y: y,
        color: color,
        size: size,
    };
    nodes.push(node);

    if (parentId) {
        links.push({
            sourceId: parentId,
            targetId: node.id
        });
    }

    drawNetwork();
}

function drawNetwork() {
    svg.innerHTML = '';

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
            line.addEventListener('click', () => deleteLink(link.sourceId, link.targetId));
            svg.appendChild(line);
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
        
        svg.appendChild(g);
    });
}

function startDrag(event) {
    event.stopPropagation();
    
    if (connectingMode || renamingMode) return;
    
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
        
        const currentRadius = activeNode.size * sizeMultiplier;
        activeNode.x = Math.max(currentRadius, Math.min(activeNode.x, svg.clientWidth - currentRadius));
        activeNode.y = Math.max(currentRadius, Math.min(activeNode.y, svg.clientHeight - currentRadius));
        
        drawNetwork();
    }
}

function endDrag() {
    activeNode = null;
    svg.removeEventListener('mousemove', drag);
    svg.removeEventListener('mouseup', endDrag);
    svg.style.cursor = 'grab';
}

function handleNodeClick(event) {
    if (activeNode) return;
    
    if (renamingMode) {
        renameNode(event);
    } else if (connectingMode) {
        handleConnectingMode(event);
    } else {
        addNodeToNode(event);
    }
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
            
            createNode(name.trim(), newX, newY, color, size, parentId = parentNode.id);
        }
    }
}

function deleteNode(event) {
    event.preventDefault();
    
    const target = event.currentTarget;
    const nodeIdToDelete = target.getAttribute('data-id');
    
    if (nodes.length > 1 && nodes.find(n => n.id === nodeIdToDelete).isCentral) {
        alert("Cannot delete the central node if other nodes exist.");
        return;
    }
    
    nodes = nodes.filter(node => node.id !== nodeIdToDelete);
    
    links = links.filter(link => 
        link.sourceId !== nodeIdToDelete && link.targetId !== nodeIdToDelete
    );
    
    drawNetwork();
}

function deleteLink(sourceId, targetId) {
    if (confirm("Are you sure you want to delete this link?")) {
        links = links.filter(link => 
            !(link.sourceId === sourceId && link.targetId === targetId)
        );
        drawNetwork();
    }
}

function toggleConnectingMode() {
    connectingMode = !connectingMode;
    connectBtn.textContent = connectingMode ? 'Cancel' : 'Connect Nodes';
    if (!connectingMode) {
        firstNodeToConnect = null;
    }
    if (connectingMode) {
        renamingMode = false;
        renameBtn.textContent = 'Rename Node';
    }
}

function toggleRenamingMode() {
    renamingMode = !renamingMode;
    renameBtn.textContent = renamingMode ? 'Cancel' : 'Rename Node';
    if (renamingMode) {
        connectingMode = false;
        connectBtn.textContent = 'Connect Nodes';
    }
}

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
        toggleConnectingMode();
        alert("Nodes connected successfully!");
    }
}

function renameNode(event) {
    const nodeIdToRename = event.currentTarget.getAttribute('data-id');
    const nodeToRename = nodes.find(n => n.id === nodeIdToRename);
    
    if (nodeToRename) {
        const newName = prompt("Enter a new name for the contact:", nodeToRename.name);
        if (newName !== null && newName.trim() !== '') {
            nodeToRename.name = newName.trim();
            drawNetwork();
        }
    }
    toggleRenamingMode();
}

function clearWeb() {
    if (confirm("Are you sure you want to clear the entire web? This cannot be undone.")) {
        nodes = [];
        links = [];
        drawNetwork();
        const defaultColor = "#007bff";
        const defaultSize = 5;
        createNode('Central Node', svg.clientWidth / 2, svg.clientHeight / 2, defaultColor, defaultSize);
    }
}

addContactBtn.addEventListener('click', () => {
    const name = contactNameInput.value.trim();
    if (name) {
        const x = nodes.length === 0 ? svg.clientWidth / 2 : Math.random() * (svg.clientWidth - nodeRadius * 2) + nodeRadius;
        const y = nodes.length === 0 ? svg.clientHeight / 2 : Math.random() * (svg.clientHeight - nodeRadius * 2) + nodeRadius;
        const color = nodeColorInput.value;
        const size = nodeSizeInput.value;
        createNode(name, x, y, color, size);
        contactNameInput.value = '';
    }
});

connectBtn.addEventListener('click', toggleConnectingMode);
renameBtn.addEventListener('click', toggleRenamingMode);
clearBtn.addEventListener('click', clearWeb);

window.addEventListener('load', () => {
    if (nodes.length === 0) {
        const defaultColor = "#007bff";
        const defaultSize = 5;
        createNode('Central Node', svg.clientWidth / 2, svg.clientHeight / 2, defaultColor, defaultSize);
    }
});