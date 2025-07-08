(function() {
    /**
     * WebCanvas v0.2.8
     * A visual editor for any HTML page with a style panel.
     */
    class WebCanvas {
        // --- CONFIGURATION & INITIALIZATION ---
        constructor() {
            if (document.getElementById('webcanvas-top-toolbar')) return;

            this.config = {
                selectors: {
                    editable: '.editable-element',
                    dragging: '.dragging',
                    selected: '.selected-element',
                },
                ids: {
                    topToolbar: 'webcanvas-top-toolbar',
                    stylePanel: 'webcanvas-style-panel',
                    vGuide: 'alignment-guide-v',
                    hGuide: 'alignment-guide-h',
                },
                classes: {
                    guide: 'alignment-guide',
                    panelOpen: 'wc-panel-open',
                },
                snapThreshold: 8,
            };

            this.draggedElement = null;
            this.selectedElement = null;
            this.isDragging = false;
            this.staticElementsCoords = [];

            this.init();
        }

        init() {
            this._injectStyles();
            this._createUI();
            this._makeElementsEditable();
            this._bindEvents();
        }

        // --- UI SETUP ---
        _injectStyles() {
            const styles = `
                body.${this.config.classes.panelOpen} {
                    margin-right: 300px;
                }
                #${this.config.ids.topToolbar} {
                    position: fixed;
                    top: 15px;
                    right: 15px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    z-index: 10002;
                    display: flex;
                    padding: 5px;
                    gap: 5px;
                    transition: right 0.3s ease-in-out; /* Add transition for smooth movement */
                }
                body.${this.config.classes.panelOpen} #${this.config.ids.topToolbar} {
                    right: 315px; /* 300px panel width + 15px margin */
                }
                #${this.config.ids.topToolbar} button {
                    background-color: #fff;
                    color: #495057;
                    border: 1px solid #ced4da;
                    border-radius: 5px;
                    cursor: pointer;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 15px;
                    gap: 8px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    font-size: 14px;
                    transition: background-color 0.2s ease, border-color 0.2s ease;
                }
                #${this.config.ids.topToolbar} button:hover {
                    background-color: #f1f3f5;
                    border-color: #adb5bd;
                }
                #${this.config.ids.topToolbar} button svg {
                    width: 18px;
                    height: 18px;
                    stroke: #495057;
                }
                
                ${this.config.selectors.editable}:hover { outline: 2px dashed #3498db; cursor: pointer; }
                ${this.config.selectors.dragging} { opacity: 0.7; cursor: grabbing !important; }
                ${this.config.selectors.selected} { outline: 2px solid #3498db !important; }
                [contenteditable="true"] { outline: 2px solid #e74c3c !important; cursor: text; }
                
                .${this.config.classes.guide} { position: fixed; background-color: #e74c3c; z-index: 9999; display: none; }
                #${this.config.ids.vGuide} { width: 1px; height: 100%; top: 0; }
                #${this.config.ids.hGuide} { height: 1px; width: 100%; left: 0; }

                #${this.config.ids.stylePanel} {
                    position: fixed; top: 0; right: -300px;
                    width: 300px; height: 100%; background-color: #f8f9fa;
                    box-shadow: -2px 0 15px rgba(0,0,0,0.1); z-index: 10001;
                    transition: right 0.3s ease-in-out;
                    font-family: 'Inter', sans-serif; display: flex; flex-direction: column;
                }
                #${this.config.ids.stylePanel}.visible { right: 0; }
                .wc-panel-header { padding: 15px; background-color: #e9ecef; display: flex; justify-content: space-between; align-items: center; }
                .wc-panel-header h3 { margin: 0; font-size: 16px; }
                .wc-panel-close { background: none; border: none; font-size: 20px; cursor: pointer; }
                .wc-panel-content { padding: 15px; overflow-y: auto; flex-grow: 1; }
                .wc-style-group { margin-bottom: 20px; }
                .wc-style-group h4 { font-size: 14px; color: #6c757d; margin: 0 0 10px 0; border-bottom: 1px solid #dee2e6; padding-bottom: 5px; }
                .wc-style-property { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
                .wc-style-property label { font-size: 13px; color: #495057; text-transform: capitalize; }
                .wc-style-property input { border: 1px solid #ced4da; border-radius: 4px; padding: 5px; width: 120px; font-size: 13px; }
                .wc-style-property input[type="color"] { padding: 0; width: 30px; height: 30px; border: none; background: none; }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        }

        _createUI() {
            const topToolbar = document.createElement('div');
            topToolbar.id = this.config.ids.topToolbar;
            
            const downloadBtn = document.createElement('button');
            downloadBtn.title = 'Download HTML';
            const downloadIconSVG = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            `;
            downloadBtn.innerHTML = `${downloadIconSVG} <span>Download</span>`;
            downloadBtn.addEventListener('click', this._handleDownload.bind(this));
            topToolbar.appendChild(downloadBtn);
            document.body.appendChild(topToolbar);

            this.stylePanel = document.createElement('div');
            this.stylePanel.id = this.config.ids.stylePanel;
            this.stylePanel.innerHTML = `
                <div class="wc-panel-header">
                    <h3>Element Styles</h3>
                    <button class="wc-panel-close">&times;</button>
                </div>
                <div class="wc-panel-content">
                    <p>Click an element to see its styles.</p>
                </div>
            `;
            document.body.appendChild(this.stylePanel);
            this.stylePanel.querySelector('.wc-panel-close').addEventListener('click', this._deselectAll.bind(this));

            this.vGuide = document.createElement('div'); this.vGuide.id = this.config.ids.vGuide; this.vGuide.className = this.config.classes.guide;
            this.hGuide = document.createElement('div'); this.hGuide.id = this.config.ids.hGuide; this.hGuide.className = this.config.classes.guide;
            document.body.appendChild(this.vGuide); document.body.appendChild(this.hGuide);
        }

        _makeElementsEditable() {
            document.querySelectorAll('body *').forEach(el => {
                const isEditorElement = el.closest(`#${this.config.ids.topToolbar}, #${this.config.ids.stylePanel}`) || el.tagName === 'SCRIPT' || el.classList.contains(this.config.classes.guide);
                if (!isEditorElement) {
                    el.classList.add(this.config.selectors.editable.substring(1));
                }
            });
        }

        // --- EVENT HANDLERS ---
        _bindEvents() {
            document.body.addEventListener('mousedown', this._handleMouseDown.bind(this));
            document.addEventListener('mousemove', this._handleMouseMove.bind(this));
            document.addEventListener('mouseup', this._handleMouseUp.bind(this));
            document.body.addEventListener('dblclick', this._handleDoubleClick.bind(this));
            document.body.addEventListener('blur', this._handleBlur.bind(this), true);
        }

        _handleMouseDown(e) {
            if (e.button !== 0 || e.target.closest(`#${this.config.ids.stylePanel}, #${this.config.ids.topToolbar}`)) return;
            
            const target = e.target.closest(this.config.selectors.editable);

            if (target && !e.target.isContentEditable) {
                e.preventDefault();
                this._selectElement(target);

                this.draggedElement = target;
                this.isDragging = false;

                const computedStyle = window.getComputedStyle(this.draggedElement);
                if (computedStyle.position === 'static') {
                    this.draggedElement.style.position = 'relative';
                }
                this.initialMouseX = e.clientX;
                this.initialMouseY = e.clientY;
                this.startLeft = parseFloat(this.draggedElement.style.left) || 0;
                this.startTop = parseFloat(this.draggedElement.style.top) || 0;
                this.initialRect = this.draggedElement.getBoundingClientRect();
                
                this.staticElementsCoords = Array.from(document.querySelectorAll(this.config.selectors.editable))
                    .filter(el => el !== this.draggedElement)
                    .map(el => {
                        const r = el.getBoundingClientRect();
                        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2 };
                    });

            } else if (!target) {
                this._deselectAll();
            }
        }

        _handleMouseMove(e) {
            if (!this.draggedElement) return;
            this.isDragging = true;
            this.draggedElement.classList.add(this.config.selectors.dragging.substring(1));
            
            const deltaX = e.clientX - this.initialMouseX;
            const deltaY = e.clientY - this.initialMouseY;
            let newLeft = this.startLeft + deltaX;
            let newTop = this.startTop + deltaY;

            const currentRect = {
                left: this.initialRect.left + deltaX, right: this.initialRect.right + deltaX,
                top: this.initialRect.top + deltaY, bottom: this.initialRect.bottom + deltaY,
                centerX: this.initialRect.left + deltaX + this.initialRect.width / 2,
                centerY: this.initialRect.top + deltaY + this.initialRect.height / 2
            };

            const snap = this._calculateSnapPoints(currentRect, { newLeft, newTop });
            
            if (snap.v.dist < this.config.snapThreshold) newLeft = snap.v.pos;
            if (snap.h.dist < this.config.snapThreshold) newTop = snap.h.pos;

            this._updateGuides(snap);
            this.draggedElement.style.left = `${newLeft}px`;
            this.draggedElement.style.top = `${newTop}px`;
            
            if (this.draggedElement === this.selectedElement) {
                this._updatePositionInPanel(newLeft, newTop);
            }
        }

        _handleMouseUp(e) {
            if (this.isDragging) {
                this.draggedElement.classList.remove(this.config.selectors.dragging.substring(1));
                this.vGuide.style.display = 'none';
                this.hGuide.style.display = 'none';
            }
            
            this.draggedElement = null;
            this.isDragging = false;
        }
        
        _handleDoubleClick(e) {
            const target = e.target.closest(this.config.selectors.editable);
            if (target) {
                this._selectElement(target);
                if (!target.isContentEditable && target.children.length === 0) {
                    e.stopPropagation();
                    target.contentEditable = true;
                    target.focus();
                    document.execCommand('selectAll', false, null);
                }
            }
        }
        
        _handleBlur(e) { if (e.target.isContentEditable) e.target.contentEditable = false; }
        
        _handleDownload() {
            this._deselectAll();
            
            const pageClone = document.documentElement.cloneNode(true);
            
            pageClone.querySelector(`#${this.config.ids.topToolbar}`)?.remove();
            pageClone.querySelector('#webcanvas-script')?.remove();
            pageClone.querySelector(`#${this.config.ids.vGuide}`)?.remove();
            pageClone.querySelector(`#${this.config.ids.hGuide}`)?.remove();
            
            pageClone.querySelectorAll(this.config.selectors.editable).forEach(el => el.classList.remove(this.config.selectors.editable.substring(1)));
            pageClone.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
            pageClone.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));
            
            const cleanHtml = '<!DOCTYPE html>\n' + pageClone.outerHTML;
            const blob = new Blob([cleanHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = 'edited-page.html';
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // --- CORE LOGIC METHODS ---
        _selectElement(element) {
            if (this.selectedElement === element) return;
            this._deselectAll();
            
            this.selectedElement = element;
            this.selectedElement.classList.add(this.config.selectors.selected.substring(1));
            this.stylePanel.classList.add('visible');
            document.body.classList.add(this.config.classes.panelOpen);
            this._updateStylePanel();
        }

        _deselectAll() {
            if (this.selectedElement) {
                this.selectedElement.classList.remove(this.config.selectors.selected.substring(1));
            }
            this.selectedElement = null;
            this.stylePanel.classList.remove('visible');
            document.body.classList.remove(this.config.classes.panelOpen);
        }

        _updateStylePanel() {
            const content = this.stylePanel.querySelector('.wc-panel-content');
            if (!this.selectedElement) {
                content.innerHTML = '<p>Click an element to see its styles.</p>';
                return;
            }
            content.innerHTML = '';

            const computedStyle = window.getComputedStyle(this.selectedElement);
            const styleGroups = {
                'Position': ['top', 'left'],
                'Typography': ['color', 'fontSize', 'fontWeight', 'textAlign'],
                'Sizing & Spacing': ['width', 'height', 'padding', 'margin'],
                'Background': ['backgroundColor'],
                'Borders': ['border', 'borderRadius']
            };

            for (const groupName in styleGroups) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'wc-style-group';
                groupDiv.innerHTML = `<h4>${groupName}</h4>`;
                
                styleGroups[groupName].forEach(prop => {
                    const propDiv = document.createElement('div');
                    propDiv.className = 'wc-style-property';
                    
                    const label = document.createElement('label');
                    label.textContent = prop.replace(/([A-Z])/g, ' $1');
                    
                    const input = document.createElement('input');
                    const isColor = prop.toLowerCase().includes('color');
                    input.type = isColor ? 'color' : 'text';
                    input.id = `wc-style-input-${prop}`;
                    
                    let value = this.selectedElement.style[prop] || computedStyle[prop];
                    if (isColor) {
                        value = this._rgbToHex(value);
                    }
                    input.value = value;
                    
                    input.addEventListener('input', (e) => {
                        this.selectedElement.style[prop] = e.target.value;
                    });

                    propDiv.appendChild(label);
                    propDiv.appendChild(input);
                    groupDiv.appendChild(propDiv);
                });
                content.appendChild(groupDiv);
            }
        }
        
        _updatePositionInPanel(left, top) {
            const leftInput = document.getElementById('wc-style-input-left');
            const topInput = document.getElementById('wc-style-input-top');
            if (leftInput) leftInput.value = `${left.toFixed(1)}px`;
            if (topInput) topInput.value = `${top.toFixed(1)}px`;
        }

        // --- HELPER LOGIC ---
        _rgbToHex(col) {
            if (!col || typeof col !== 'string') return '#000000';
            if (col.startsWith('#')) return col;

            const match = col.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
            if (!match) return col;

            const toHex = (c) => ('0' + parseInt(c).toString(16)).slice(-2);
            return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
        }

        _calculateSnapPoints(currentRect, { newLeft, newTop }) {
            let bestSnap = { v: { dist: Infinity, pos: 0, guide: 0 }, h: { dist: Infinity, pos: 0, guide: 0 } };
            for (const coords of this.staticElementsCoords) {
                const checksV = [
                    { dist: Math.abs(currentRect.left - coords.left), pos: coords.left - (currentRect.left - newLeft), guide: coords.left },
                    { dist: Math.abs(currentRect.right - coords.right), pos: coords.right - (currentRect.right - newLeft), guide: coords.right },
                    { dist: Math.abs(currentRect.centerX - coords.centerX), pos: coords.centerX - (currentRect.centerX - newLeft), guide: coords.centerX }
                ];
                const checksH = [
                    { dist: Math.abs(currentRect.top - coords.top), pos: coords.top - (currentRect.top - newTop), guide: coords.top },
                    { dist: Math.abs(currentRect.bottom - coords.bottom), pos: coords.bottom - (currentRect.bottom - newTop), guide: coords.bottom },
                    { dist: Math.abs(currentRect.centerY - coords.centerY), pos: coords.centerY - (currentRect.centerY - newTop), guide: coords.centerY }
                ];
                for (const check of checksV) if (check.dist < this.config.snapThreshold && check.dist < bestSnap.v.dist) bestSnap.v = check;
                for (const check of checksH) if (check.dist < this.config.snapThreshold && check.dist < bestSnap.h.dist) bestSnap.h = check;
            }
            return bestSnap;
        }
        _updateGuides(snap) {
            this.vGuide.style.display = 'none'; this.hGuide.style.display = 'none';
            if (snap.v.dist < this.config.snapThreshold) { this.vGuide.style.left = `${snap.v.guide}px`; this.vGuide.style.display = 'block'; }
            if (snap.h.dist < this.config.snapThreshold) { this.hGuide.style.top = `${snap.h.guide}px`; this.hGuide.style.display = 'block'; }
        }
    }

    new WebCanvas();
})();