class PixelArtEditor {
    constructor() {
        this.canvas = document.getElementById('pixelCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Infinite canvas properties
        this.pixelSize = 20;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
        
        // Drawing state
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.isDrawing = false;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        // Pixel data (infinite grid stored as object)
        this.pixels = {};
        
        // Template
        this.showTemplate = false;
        this.template = this.loadTemplate();
        this.templateOffsetX = -6;  // Center horizontally (template width is ~13)
        this.templateOffsetY = -10; // Center vertically (template height is ~20)
        
        // History
        this.history = [];
        this.historyIndex = -1;
        
        // Export frame
        this.showFrame = false;
        this.frameX = 0;
        this.frameY = 0;
        this.frameWidth = 13;
        this.frameHeight = 20;
        this.isDraggingFrame = false;
        this.isResizingFrame = false;
        this.resizeHandle = null;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.frameStartX = 0;
        this.frameStartY = 0;
        this.frameStartWidth = 0;
        this.frameStartHeight = 0;
        
        // Grid
        this.showGrid = false;
        
        this.setupCanvas();
        this.setupEventListeners();
        this.initializeUI();
        this.centerCanvas();
        this.saveHistory();
        this.render();
    }
    
    initializeUI() {
        // Set initial grid icon opacity
        const gridIcon = document.querySelector('#toggleGridBtn i');
        gridIcon.style.opacity = this.showGrid ? '1' : '0.3';
        
        // Set initial frame icon opacity
        const frameIcon = document.querySelector('#toggleFrameBtn i');
        frameIcon.style.opacity = this.showFrame ? '1' : '0.3';
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.render();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    centerCanvas() {
        this.offsetX = Math.floor(this.canvas.width / 2);
        this.offsetY = Math.floor(this.canvas.height / 2);
    }
    
    loadTemplate() {
        return {
            head: [
                [6,0], [5,0], [4,0], [3,1], [2,1], [1,2], [0,3], [0,4], [0,5], [0,6], 
                [0,7], [0,8], [0,9], [1,10], [2,11], [3,11], [4,12], [5,12], [6,12], 
                [6,2], [6,10], [5,3], [5,4], [5,5], [5,6], [5,7], [5,8], [5,9]
            ],
            face: [
                [9,1], [8,1], [7,1], [10,2], [11,3], [11,4], [11,5], [11,6], [11,7], 
                [11,8], [11,9], [10,10], [9,11], [8,11], [7,11], [9,4], [8,4], [7,4], 
                [9,8], [8,8], [7,8]
            ],
            arms: [
                [12,4], [12,8], [13,3], [13,9], [14,2], [14,10], [15,1], [15,11], 
                [15,3], [15,4], [15,8], [15,9], [16,2], [16,10]
            ],
            legs: [
                [16,4], [17,4], [18,4], [16,8], [17,8], [18,8], [17,6], [18,6], 
                [19,5], [19,7]
            ]
        };
    }
    
    setupEventListeners() {
        // Tool buttons
        document.getElementById('penTool').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('eraserTool').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('panTool').addEventListener('click', () => this.setTool('pan'));
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Zoom slider
        document.getElementById('zoomRange').addEventListener('input', (e) => {
            this.zoom = parseInt(e.target.value) / 100;
            document.getElementById('zoomLevel').value = e.target.value + '%';
            this.render();
        });
        
        // Zoom level input
        document.getElementById('zoomLevel').addEventListener('change', (e) => {
            let value = parseInt(e.target.value.replace('%', ''));
            
            if (isNaN(value)) {
                value = 100;
            }
            
            value = Math.max(50, Math.min(500, value));
            
            this.zoom = value / 100;
            document.getElementById('zoomRange').value = value;
            document.getElementById('zoomLevel').value = value + '%';
            this.render();
        });
        
        document.getElementById('zoomLevel').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.target.blur();
            }
        });
        
        // Template button
        document.getElementById('templateBtn').addEventListener('click', () => this.openTemplateModal());
        
        // Modal
        document.querySelector('.modal-overlay').addEventListener('click', () => this.closeTemplateModal());
        
        // Template actions in modal
        document.querySelectorAll('.toggle-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTemplate();
            });
        });
        document.querySelectorAll('.apply-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyTemplate();
                this.closeTemplateModal();
            });
        });
        
        // Action buttons
        document.getElementById('toggleFrameBtn').addEventListener('click', () => this.toggleFrame());
        document.getElementById('toggleGridBtn').addEventListener('click', () => this.toggleGrid());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportPNG());
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Tools
            if (e.key === 'p' || e.key === 'P') this.setTool('pen');
            if (e.key === 'e' || e.key === 'E') this.setTool('eraser');
            if (e.key === ' ') {
                e.preventDefault();
                this.setTool('pan');
            }
            
            // Template
            if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                this.openTemplateModal();
            }
            
            // Grid
            if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                this.toggleGrid();
            }
            
            // Export Frame
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggleFrame();
            }
            
            // Undo/Redo
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.undo();
            }
            
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Remove active from all tool buttons
        document.querySelectorAll('#penTool, #eraserTool, #panTool').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (tool === 'pen') {
            document.getElementById('penTool').classList.add('active');
            this.canvas.classList.remove('panning');
        } else if (tool === 'eraser') {
            document.getElementById('eraserTool').classList.add('active');
            this.canvas.classList.remove('panning');
        } else if (tool === 'pan') {
            document.getElementById('panTool').classList.add('active');
            this.canvas.classList.add('panning');
        }
    }
    
    screenToGrid(screenX, screenY) {
        const scale = this.pixelSize * this.zoom;
        const gridX = Math.floor((screenX - this.offsetX) / scale);
        const gridY = Math.floor((screenY - this.offsetY) / scale);
        return { x: gridX, y: gridY };
    }
    
    gridToScreen(gridX, gridY) {
        const scale = this.pixelSize * this.zoom;
        const screenX = gridX * scale + this.offsetX;
        const screenY = gridY * scale + this.offsetY;
        return { x: screenX, y: screenY };
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if clicking on frame
        if (this.showFrame) {
            const handle = this.getFrameHandle(mouseX, mouseY);
            
            if (handle) {
                this.isResizingFrame = true;
                this.resizeHandle = handle;
                this.dragStartX = mouseX;
                this.dragStartY = mouseY;
                this.frameStartX = this.frameX;
                this.frameStartY = this.frameY;
                this.frameStartWidth = this.frameWidth;
                this.frameStartHeight = this.frameHeight;
                return;
            }
            
            if (this.isInsideFrame(mouseX, mouseY)) {
                this.isDraggingFrame = true;
                this.dragStartX = mouseX;
                this.dragStartY = mouseY;
                this.frameStartX = this.frameX;
                this.frameStartY = this.frameY;
                return;
            }
        }
        
        if (this.currentTool === 'pan') {
            this.isPanning = true;
            this.lastPanX = mouseX;
            this.lastPanY = mouseY;
        } else if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
            this.isDrawing = true;
            this.drawPixel(mouseX, mouseY);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update cursor
        if (this.showFrame && !this.isDraggingFrame && !this.isResizingFrame) {
            const handle = this.getFrameHandle(mouseX, mouseY);
            if (handle) {
                this.canvas.style.cursor = this.getHandleCursor(handle);
            } else if (this.isInsideFrame(mouseX, mouseY)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
            }
        }
        
        if (this.isDraggingFrame) {
            const grid = this.screenToGrid(mouseX, mouseY);
            const startGrid = this.screenToGrid(this.dragStartX, this.dragStartY);
            const deltaX = grid.x - startGrid.x;
            const deltaY = grid.y - startGrid.y;
            this.frameX = this.frameStartX + deltaX;
            this.frameY = this.frameStartY + deltaY;
            this.render();
        } else if (this.isResizingFrame) {
            this.resizeFrame(mouseX, mouseY);
        } else if (this.isPanning) {
            const deltaX = mouseX - this.lastPanX;
            const deltaY = mouseY - this.lastPanY;
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            this.lastPanX = mouseX;
            this.lastPanY = mouseY;
            this.render();
        } else if (this.isDrawing) {
            this.drawPixel(mouseX, mouseY);
        }
    }
    
    handleMouseUp() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveHistory();
        }
        this.isPanning = false;
        this.isDraggingFrame = false;
        this.isResizingFrame = false;
        this.resizeHandle = null;
        this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
    }
    
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.zoom = Math.max(0.5, Math.min(5, this.zoom + delta));
        const zoomPercent = Math.round(this.zoom * 100);
        document.getElementById('zoomLevel').textContent = zoomPercent + '%';
        document.getElementById('zoomRange').value = zoomPercent;
        this.render();
    }
    
    drawPixel(screenX, screenY) {
        const grid = this.screenToGrid(screenX, screenY);
        const key = `${grid.x},${grid.y}`;
        
        if (this.currentTool === 'pen') {
            this.pixels[key] = this.currentColor;
        } else if (this.currentTool === 'eraser') {
            delete this.pixels[key];
        }
        
        this.render();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background pattern
        this.drawBackground();
        
        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }
        
        // Draw template
        if (this.showTemplate) {
            this.drawTemplate();
        }
        
        // Draw pixels
        this.drawPixels();
        
        // Draw export frame
        if (this.showFrame) {
            this.drawFrame();
        }
    }
    
    drawBackground() {
        const scale = this.pixelSize * this.zoom;
        const startX = Math.floor(-this.offsetX / scale) - 1;
        const startY = Math.floor(-this.offsetY / scale) - 1;
        const endX = Math.floor((this.canvas.width - this.offsetX) / scale) + 1;
        const endY = Math.floor((this.canvas.height - this.offsetY) / scale) + 1;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        const scale = this.pixelSize * this.zoom;
        const startX = Math.floor(-this.offsetX / scale) - 1;
        const startY = Math.floor(-this.offsetY / scale) - 1;
        const endX = Math.floor((this.canvas.width - this.offsetX) / scale) + 1;
        const endY = Math.floor((this.canvas.height - this.offsetY) / scale) + 1;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x <= endX; x++) {
            const screenX = x * scale + this.offsetX;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y++) {
            const screenY = y * scale + this.offsetY;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }
    }
    
    drawTemplate() {
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        const scale = this.pixelSize * this.zoom;
        
        Object.values(this.template).forEach(part => {
            part.forEach(([row, col]) => {
                const gridX = col + this.templateOffsetX;
                const gridY = row + this.templateOffsetY;
                const screen = this.gridToScreen(gridX, gridY);
                this.ctx.fillRect(screen.x, screen.y, scale, scale);
            });
        });
    }
    
    drawPixels() {
        const scale = this.pixelSize * this.zoom;
        
        Object.entries(this.pixels).forEach(([key, color]) => {
            const [x, y] = key.split(',').map(Number);
            const screen = this.gridToScreen(x, y);
            
            if (screen.x + scale >= 0 && screen.x < this.canvas.width &&
                screen.y + scale >= 0 && screen.y < this.canvas.height) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(screen.x, screen.y, scale, scale);
            }
        });
    }
    
    drawFrame() {
        const scale = this.pixelSize * this.zoom;
        const screen = this.gridToScreen(this.frameX, this.frameY);
        const width = this.frameWidth * scale;
        const height = this.frameHeight * scale;
        
        // Draw overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear frame area
        this.ctx.clearRect(screen.x, screen.y, width, height);
        
        // Redraw content in frame
        if (this.showTemplate) {
            this.ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
            Object.values(this.template).forEach(part => {
                part.forEach(([row, col]) => {
                    const gridX = col + this.templateOffsetX;
                    const gridY = row + this.templateOffsetY;
                    
                    if (gridX >= this.frameX && gridX < this.frameX + this.frameWidth &&
                        gridY >= this.frameY && gridY < this.frameY + this.frameHeight) {
                        const s = this.gridToScreen(gridX, gridY);
                        this.ctx.fillRect(s.x, s.y, scale, scale);
                    }
                });
            });
        }
        
        Object.entries(this.pixels).forEach(([key, color]) => {
            const [x, y] = key.split(',').map(Number);
            
            if (x >= this.frameX && x < this.frameX + this.frameWidth &&
                y >= this.frameY && y < this.frameY + this.frameHeight) {
                const s = this.gridToScreen(x, y);
                this.ctx.fillStyle = color;
                this.ctx.fillRect(s.x, s.y, scale, scale);
            }
        });
        
        // Draw frame border
        this.ctx.strokeStyle = '#007bff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screen.x, screen.y, width, height);
        
        // Draw resize handles
        this.drawFrameHandles(screen.x, screen.y, width, height);
    }
    
    drawFrameHandles(x, y, width, height) {
        const handleSize = 12;
        const edgeHandleSize = 40;
        
        this.ctx.fillStyle = '#007bff';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        
        // Corners
        this.ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        this.ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        
        this.ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        this.ctx.strokeRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        
        this.ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        this.ctx.strokeRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        
        this.ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        this.ctx.strokeRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        
        // Edges
        this.ctx.fillRect(x + width/2 - edgeHandleSize/2, y - 4, edgeHandleSize, 8);
        this.ctx.strokeRect(x + width/2 - edgeHandleSize/2, y - 4, edgeHandleSize, 8);
        
        this.ctx.fillRect(x + width/2 - edgeHandleSize/2, y + height - 4, edgeHandleSize, 8);
        this.ctx.strokeRect(x + width/2 - edgeHandleSize/2, y + height - 4, edgeHandleSize, 8);
        
        this.ctx.fillRect(x - 4, y + height/2 - edgeHandleSize/2, 8, edgeHandleSize);
        this.ctx.strokeRect(x - 4, y + height/2 - edgeHandleSize/2, 8, edgeHandleSize);
        
        this.ctx.fillRect(x + width - 4, y + height/2 - edgeHandleSize/2, 8, edgeHandleSize);
        this.ctx.strokeRect(x + width - 4, y + height/2 - edgeHandleSize/2, 8, edgeHandleSize);
    }
    
    isInsideFrame(mouseX, mouseY) {
        const scale = this.pixelSize * this.zoom;
        const screen = this.gridToScreen(this.frameX, this.frameY);
        const width = this.frameWidth * scale;
        const height = this.frameHeight * scale;
        
        return mouseX >= screen.x && mouseX <= screen.x + width &&
               mouseY >= screen.y && mouseY <= screen.y + height;
    }
    
    getFrameHandle(mouseX, mouseY) {
        const scale = this.pixelSize * this.zoom;
        const screen = this.gridToScreen(this.frameX, this.frameY);
        const width = this.frameWidth * scale;
        const height = this.frameHeight * scale;
        
        const handleSize = 12;
        const edgeHandleSize = 40;
        const tolerance = 8;
        
        // Check corners
        if (this.isNearPoint(mouseX, mouseY, screen.x, screen.y, handleSize)) {
            return 'tl';
        }
        if (this.isNearPoint(mouseX, mouseY, screen.x + width, screen.y, handleSize)) {
            return 'tr';
        }
        if (this.isNearPoint(mouseX, mouseY, screen.x, screen.y + height, handleSize)) {
            return 'bl';
        }
        if (this.isNearPoint(mouseX, mouseY, screen.x + width, screen.y + height, handleSize)) {
            return 'br';
        }
        
        // Check edges
        if (Math.abs(mouseY - screen.y) < tolerance &&
            mouseX >= screen.x + width/2 - edgeHandleSize/2 &&
            mouseX <= screen.x + width/2 + edgeHandleSize/2) {
            return 'top';
        }
        if (Math.abs(mouseY - (screen.y + height)) < tolerance &&
            mouseX >= screen.x + width/2 - edgeHandleSize/2 &&
            mouseX <= screen.x + width/2 + edgeHandleSize/2) {
            return 'bottom';
        }
        if (Math.abs(mouseX - screen.x) < tolerance &&
            mouseY >= screen.y + height/2 - edgeHandleSize/2 &&
            mouseY <= screen.y + height/2 + edgeHandleSize/2) {
            return 'left';
        }
        if (Math.abs(mouseX - (screen.x + width)) < tolerance &&
            mouseY >= screen.y + height/2 - edgeHandleSize/2 &&
            mouseY <= screen.y + height/2 + edgeHandleSize/2) {
            return 'right';
        }
        
        return null;
    }
    
    isNearPoint(x, y, targetX, targetY, tolerance) {
        return Math.abs(x - targetX) <= tolerance && Math.abs(y - targetY) <= tolerance;
    }
    
    getHandleCursor(handle) {
        const cursors = {
            'tl': 'nwse-resize',
            'tr': 'nesw-resize',
            'bl': 'nesw-resize',
            'br': 'nwse-resize',
            'top': 'ns-resize',
            'bottom': 'ns-resize',
            'left': 'ew-resize',
            'right': 'ew-resize'
        };
        return cursors[handle] || 'default';
    }
    
    resizeFrame(mouseX, mouseY) {
        const grid = this.screenToGrid(mouseX, mouseY);
        const startGrid = this.screenToGrid(this.dragStartX, this.dragStartY);
        const deltaX = grid.x - startGrid.x;
        const deltaY = grid.y - startGrid.y;
        
        switch (this.resizeHandle) {
            case 'tl':
                this.frameX = Math.min(this.frameStartX + deltaX, this.frameStartX + this.frameStartWidth - 1);
                this.frameY = Math.min(this.frameStartY + deltaY, this.frameStartY + this.frameStartHeight - 1);
                this.frameWidth = this.frameStartWidth - (this.frameX - this.frameStartX);
                this.frameHeight = this.frameStartHeight - (this.frameY - this.frameStartY);
                break;
            case 'tr':
                this.frameY = Math.min(this.frameStartY + deltaY, this.frameStartY + this.frameStartHeight - 1);
                this.frameWidth = Math.max(1, this.frameStartWidth + deltaX);
                this.frameHeight = this.frameStartHeight - (this.frameY - this.frameStartY);
                break;
            case 'bl':
                this.frameX = Math.min(this.frameStartX + deltaX, this.frameStartX + this.frameStartWidth - 1);
                this.frameWidth = this.frameStartWidth - (this.frameX - this.frameStartX);
                this.frameHeight = Math.max(1, this.frameStartHeight + deltaY);
                break;
            case 'br':
                this.frameWidth = Math.max(1, this.frameStartWidth + deltaX);
                this.frameHeight = Math.max(1, this.frameStartHeight + deltaY);
                break;
            case 'top':
                this.frameY = Math.min(this.frameStartY + deltaY, this.frameStartY + this.frameStartHeight - 1);
                this.frameHeight = this.frameStartHeight - (this.frameY - this.frameStartY);
                break;
            case 'bottom':
                this.frameHeight = Math.max(1, this.frameStartHeight + deltaY);
                break;
            case 'left':
                this.frameX = Math.min(this.frameStartX + deltaX, this.frameStartX + this.frameStartWidth - 1);
                this.frameWidth = this.frameStartWidth - (this.frameX - this.frameStartX);
                break;
            case 'right':
                this.frameWidth = Math.max(1, this.frameStartWidth + deltaX);
                break;
        }
        
        // Ensure minimum size
        this.frameWidth = Math.max(1, this.frameWidth);
        this.frameHeight = Math.max(1, this.frameHeight);
        
        this.render();
    }
    
    openTemplateModal() {
        document.getElementById('templateModal').classList.add('active');
    }
    
    closeTemplateModal() {
        document.getElementById('templateModal').classList.remove('active');
    }
    
    toggleTemplate() {
        this.showTemplate = !this.showTemplate;
        const icons = document.querySelectorAll('.toggle-template i');
        icons.forEach(icon => {
            if (this.showTemplate) {
                icon.className = 'fi fi-rs-eye';
            } else {
                icon.className = 'fi fi-rs-crossed-eye';
            }
        });
        this.render();
    }
    
    applyTemplate() {
        Object.values(this.template).forEach(part => {
            part.forEach(([row, col]) => {
                const gridX = col + this.templateOffsetX;
                const gridY = row + this.templateOffsetY;
                const key = `${gridX},${gridY}`;
                this.pixels[key] = '#000000';
            });
        });
        this.saveHistory();
        this.render();
    }
    
    toggleFrame() {
        this.showFrame = !this.showFrame;
        const icon = document.querySelector('#toggleFrameBtn i');
        icon.style.opacity = this.showFrame ? '1' : '0.3';
        this.render();
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        const icon = document.querySelector('#toggleGridBtn i');
        icon.style.opacity = this.showGrid ? '1' : '0.3';
        this.render();
    }
    
    saveHistory() {
        const pixelsCopy = { ...this.pixels };
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(pixelsCopy);
        this.historyIndex++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.pixels = { ...this.history[this.historyIndex] };
            this.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.pixels = { ...this.history[this.historyIndex] };
            this.render();
        }
    }
    
    clear() {
        this.pixels = {};
        this.saveHistory();
        this.render();
    }
    
    exportPNG() {
        const scale = 32;
        let minX, maxX, minY, maxY, width, height, offsetX, offsetY;
        
        if (this.showFrame) {
            minX = this.frameX;
            minY = this.frameY;
            width = this.frameWidth;
            height = this.frameHeight;
            offsetX = this.frameX;
            offsetY = this.frameY;
        } else {
            const pixelCoords = Object.keys(this.pixels).map(key => {
                const [x, y] = key.split(',').map(Number);
                return { x, y };
            });
            
            if (pixelCoords.length === 0) {
                alert('No pixels to export!');
                return;
            }
            
            minX = Math.min(...pixelCoords.map(p => p.x));
            maxX = Math.max(...pixelCoords.map(p => p.x));
            minY = Math.min(...pixelCoords.map(p => p.y));
            maxY = Math.max(...pixelCoords.map(p => p.y));
            
            width = maxX - minX + 1;
            height = maxY - minY + 1;
            offsetX = minX;
            offsetY = minY;
        }
        
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width * scale;
        exportCanvas.height = height * scale;
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const gridX = offsetX + x;
                const gridY = offsetY + y;
                const key = `${gridX},${gridY}`;
                
                if (this.pixels[key]) {
                    exportCtx.fillStyle = this.pixels[key];
                    exportCtx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixelart_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PixelArtEditor();
});
