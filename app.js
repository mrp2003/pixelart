class PixelArtEditor {
    constructor() {
        this.canvas = document.getElementById('pixelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridWidth = 13;
        this.gridHeight = 20;
        this.pixelSize = 20;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.isDrawing = false;
        this.showTemplate = true;
        this.showGrid = false;
        
        this.grid = [];
        this.template = this.loadTemplate();
        this.history = [];
        this.historyIndex = -1;
        
        this.initializeGrid();
        this.setupCanvas();
        this.setupEventListeners();
        this.saveHistory();
        this.render();
    }
    
    initializeGrid(applyTemplate = false) {
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
        
        if (applyTemplate && this.template) {
            this.applyTemplateToGrid();
        }
    }
    
    applyTemplateToGrid() {
        Object.values(this.template).forEach(part => {
            part.forEach(([row, col]) => {
                if (row < this.gridHeight && col < this.gridWidth) {
                    this.grid[row][col] = '#000000';
                }
            });
        });
    }
    
    loadTemplate() {
        const templateData = {
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
        
        return templateData;
    }
    
    setupCanvas() {
        this.canvas.width = this.gridWidth * this.pixelSize;
        this.canvas.height = this.gridHeight * this.pixelSize;
    }
    
    setupEventListeners() {
        // Tool buttons
        document.getElementById('penTool').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('eraserTool').addEventListener('click', () => this.setTool('eraser'));
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Action buttons
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportPNG());
        document.getElementById('toggleTemplateBtn').addEventListener('click', () => this.toggleTemplate());
        document.getElementById('toggleGridBtn').addEventListener('click', () => this.toggleGrid());
        document.getElementById('applyTemplateBtn').addEventListener('click', () => this.applyTemplate());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        // Resize handles
        this.setupResizeHandles();
        
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') this.setTool('pen');
            if (e.key === 'e' || e.key === 'E') this.setTool('eraser');
            
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
        
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        
        if (tool === 'pen') {
            document.getElementById('penTool').classList.add('active');
            this.canvas.style.cursor = 'crosshair';
        } else if (tool === 'eraser') {
            document.getElementById('eraserTool').classList.add('active');
            this.canvas.style.cursor = 'cell';
        }
    }
    
    getGridPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) / this.pixelSize);
        
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
            return { x, y };
        }
        return null;
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        this.draw(e);
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getGridPosition(e);
        if (!pos) return;
        
        if (this.currentTool === 'pen') {
            this.grid[pos.y][pos.x] = this.currentColor;
        } else if (this.currentTool === 'eraser') {
            this.grid[pos.y][pos.x] = null;
        }
        
        this.render();
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveHistory();
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw template layer (if enabled)
        if (this.showTemplate) {
            this.renderTemplate();
        }
        
        // Draw grid lines (if enabled)
        if (this.showGrid) {
            this.ctx.strokeStyle = '#e0e0e0';
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i <= this.gridWidth; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(i * this.pixelSize, 0);
                this.ctx.lineTo(i * this.pixelSize, this.canvas.height);
                this.ctx.stroke();
            }
            
            for (let i = 0; i <= this.gridHeight; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, i * this.pixelSize);
                this.ctx.lineTo(this.canvas.width, i * this.pixelSize);
                this.ctx.stroke();
            }
        }
        
        // Draw pixels
        const padding = this.showGrid ? 1 : 0;
        const size = this.showGrid ? this.pixelSize - 2 : this.pixelSize;
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    this.ctx.fillStyle = this.grid[y][x];
                    this.ctx.fillRect(
                        x * this.pixelSize + padding,
                        y * this.pixelSize + padding,
                        size,
                        size
                    );
                }
            }
        }
    }
    
    renderTemplate() {
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        const padding = this.showGrid ? 1 : 0;
        const size = this.showGrid ? this.pixelSize - 2 : this.pixelSize;
        
        Object.values(this.template).forEach(part => {
            part.forEach(([row, col]) => {
                if (row < this.gridHeight && col < this.gridWidth) {
                    this.ctx.fillRect(
                        col * this.pixelSize + padding,
                        row * this.pixelSize + padding,
                        size,
                        size
                    );
                }
            });
        });
    }
    
    toggleTemplate() {
        this.showTemplate = !this.showTemplate;
        const btn = document.getElementById('toggleTemplateBtn');
        btn.textContent = this.showTemplate ? 'Hide Template' : 'Show Template';
        this.render();
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        const btn = document.getElementById('toggleGridBtn');
        btn.textContent = this.showGrid ? 'Hide Grid' : 'Show Grid';
        this.render();
    }
    
    applyTemplate() {
        this.applyTemplateToGrid();
        this.saveHistory();
        this.render();
    }
    
    saveHistory() {
        const gridCopy = this.grid.map(row => [...row]);
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(gridCopy);
        this.historyIndex++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.grid = this.history[this.historyIndex].map(row => [...row]);
            this.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.grid = this.history[this.historyIndex].map(row => [...row]);
            this.render();
        }
    }
    
    clear() {
        if (confirm('Clear the entire canvas?')) {
            this.initializeGrid();
            this.saveHistory();
            this.render();
        }
    }
    
    setupResizeHandles() {
        const handles = {
            top: document.querySelector('.resize-handle-top'),
            right: document.querySelector('.resize-handle-right'),
            bottom: document.querySelector('.resize-handle-bottom'),
            left: document.querySelector('.resize-handle-left')
        };
        
        let isDragging = false;
        let dragHandle = null;
        let startY = 0;
        let startX = 0;
        
        const startDrag = (e, handle) => {
            isDragging = true;
            dragHandle = handle;
            startY = e.clientY;
            startX = e.clientX;
            e.preventDefault();
        };
        
        const onDrag = (e) => {
            if (!isDragging) return;
            
            const deltaY = Math.floor((e.clientY - startY) / this.pixelSize);
            const deltaX = Math.floor((e.clientX - startX) / this.pixelSize);
            
            if (deltaY === 0 && deltaX === 0) return;
            
            if (dragHandle === 'bottom' && deltaY !== 0) {
                this.resizeBottom(deltaY);
                startY = e.clientY;
            } else if (dragHandle === 'top' && deltaY !== 0) {
                this.resizeTop(deltaY);
                startY = e.clientY;
            } else if (dragHandle === 'right' && deltaX !== 0) {
                this.resizeRight(deltaX);
                startX = e.clientX;
            } else if (dragHandle === 'left' && deltaX !== 0) {
                this.resizeLeft(deltaX);
                startX = e.clientX;
            }
        };
        
        const stopDrag = () => {
            if (isDragging) {
                isDragging = false;
                dragHandle = null;
                this.saveHistory();
            }
        };
        
        handles.top.addEventListener('mousedown', (e) => startDrag(e, 'top'));
        handles.right.addEventListener('mousedown', (e) => startDrag(e, 'right'));
        handles.bottom.addEventListener('mousedown', (e) => startDrag(e, 'bottom'));
        handles.left.addEventListener('mousedown', (e) => startDrag(e, 'left'));
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    }
    
    resizeBottom(delta) {
        const newHeight = Math.max(1, this.gridHeight + delta);
        if (newHeight === this.gridHeight) return;
        
        const oldGrid = this.grid.map(row => [...row]);
        
        this.gridHeight = newHeight;
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
        
        for (let y = 0; y < Math.min(oldGrid.length, this.gridHeight); y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = oldGrid[y][x];
            }
        }
        
        this.setupCanvas();
        this.render();
    }
    
    resizeTop(delta) {
        const newHeight = Math.max(1, this.gridHeight - delta);
        if (newHeight === this.gridHeight) return;
        
        const oldGrid = this.grid.map(row => [...row]);
        const rowsAdded = newHeight - this.gridHeight;
        
        this.gridHeight = newHeight;
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
        
        const startRow = rowsAdded > 0 ? rowsAdded : 0;
        const oldStartRow = rowsAdded > 0 ? 0 : -rowsAdded;
        
        for (let y = 0; y < Math.min(oldGrid.length, this.gridHeight - startRow); y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[startRow + y][x] = oldGrid[oldStartRow + y][x];
            }
        }
        
        this.setupCanvas();
        this.render();
    }
    
    resizeRight(delta) {
        const newWidth = Math.max(1, this.gridWidth + delta);
        if (newWidth === this.gridWidth) return;
        
        const oldGrid = this.grid.map(row => [...row]);
        
        this.gridWidth = newWidth;
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < Math.min(oldGrid[0].length, this.gridWidth); x++) {
                this.grid[y][x] = oldGrid[y][x];
            }
        }
        
        this.setupCanvas();
        this.render();
    }
    
    resizeLeft(delta) {
        const newWidth = Math.max(1, this.gridWidth - delta);
        if (newWidth === this.gridWidth) return;
        
        const oldGrid = this.grid.map(row => [...row]);
        const colsAdded = newWidth - this.gridWidth;
        
        this.gridWidth = newWidth;
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
        
        const startCol = colsAdded > 0 ? colsAdded : 0;
        const oldStartCol = colsAdded > 0 ? 0 : -colsAdded;
        
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < Math.min(oldGrid[0].length, this.gridWidth - startCol); x++) {
                this.grid[y][startCol + x] = oldGrid[y][oldStartCol + x];
            }
        }
        
        this.setupCanvas();
        this.render();
    }
    
    exportPNG() {
        // Create a new canvas without grid lines for export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.gridWidth;
        exportCanvas.height = this.gridHeight;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Fill with transparent background
        exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Draw only the pixels (1 pixel per grid cell)
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    exportCtx.fillStyle = this.grid[y][x];
                    exportCtx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        // Download
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

// Initialize the editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PixelArtEditor();
});
