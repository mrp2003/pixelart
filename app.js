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
        
        this.grid = [];
        this.template = this.loadTemplate();
        
        this.initializeGrid();
        this.setupCanvas();
        this.setupEventListeners();
        this.render();
    }
    
    initializeGrid() {
        this.grid = Array(this.gridHeight).fill(null).map(() => 
            Array(this.gridWidth).fill(null)
        );
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
        document.getElementById('resizeBtn').addEventListener('click', () => this.resizeGrid());
        document.getElementById('toggleTemplateBtn').addEventListener('click', () => this.toggleTemplate());
        
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') this.setTool('pen');
            if (e.key === 'e' || e.key === 'E') this.setTool('eraser');
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
        this.isDrawing = false;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw template layer (if enabled)
        if (this.showTemplate) {
            this.renderTemplate();
        }
        
        // Draw grid lines
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
        
        // Draw pixels
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (this.grid[y][x]) {
                    this.ctx.fillStyle = this.grid[y][x];
                    this.ctx.fillRect(
                        x * this.pixelSize + 1,
                        y * this.pixelSize + 1,
                        this.pixelSize - 2,
                        this.pixelSize - 2
                    );
                }
            }
        }
    }
    
    renderTemplate() {
        this.ctx.fillStyle = '#000000';
        
        Object.values(this.template).forEach(part => {
            part.forEach(([row, col]) => {
                if (row < this.gridHeight && col < this.gridWidth) {
                    this.ctx.fillRect(
                        col * this.pixelSize + 1,
                        row * this.pixelSize + 1,
                        this.pixelSize - 2,
                        this.pixelSize - 2
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
    
    clear() {
        if (confirm('Clear the entire canvas?')) {
            this.initializeGrid();
            this.render();
        }
    }
    
    resizeGrid() {
        const newWidth = parseInt(document.getElementById('gridWidth').value);
        const newHeight = parseInt(document.getElementById('gridHeight').value);
        
        if (newWidth < 1 || newHeight < 1 || newWidth > 100 || newHeight > 100) {
            alert('Grid dimensions must be between 1 and 100');
            return;
        }
        
        this.gridWidth = newWidth;
        this.gridHeight = newHeight;
        
        this.initializeGrid();
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
