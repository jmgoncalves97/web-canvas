(function () {
    /**
     * WebCanvas v0.1.0
     * A visual editor for any HTML page.
     */
    class WebCanvas {
        // --- CONFIGURATION & INITIALIZATION ---
        constructor() {
            if (document.getElementById('editor-toolbar')) return;

            this.config = {
                selectors: {
                    editable: '.editable-element',
                    dragging: '.dragging',
                },
                ids: {
                    toolbar: 'web-canvaseditor-toolbar',
                    vGuide: 'alignment-guide-v',
                    hGuide: 'alignment-guide-h',
                },
                classes: {
                    guide: 'alignment-guide'
                },
                snapThreshold: 8,
            };

            // Application state
            this.draggedElement = null;
            this.staticElementsCoords = [];
            this.initialMouseX = 0;
            this.initialMouseY = 0;
            this.startLeft = 0;
            this.startTop = 0;
            this.initialRect = null;

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
                #${this.config.ids.toolbar} {
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                    background-color: rgba(44, 62, 80, 0.9);
                    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 8px;
                    border-radius: 50px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    display: flex;
                }
                #${this.config.ids.toolbar} button {
                    background-color: #3498db;
                    color: white;
                    border: none;
                    border-radius: 30px;
                    cursor: pointer;
                    font-weight: 500;
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px 20px;
                    font-size: 15px;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                #${this.config.ids.toolbar} button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(52, 152, 219, 0.4);
                    background-color: #3cafff;
                }
                #${this.config.ids.toolbar} button svg {
                    stroke: white;
                    width: 18px;
                    height: 18px;
                    transition: transform 0.2s ease-in-out;
                }
                #${this.config.ids.toolbar} button:hover svg {
                    transform: scale(1.1);
                }
                ${this.config.selectors.editable}:hover { outline: 2px dashed #3498db; cursor: grab; }
                ${this.config.selectors.dragging} { opacity: 0.7; cursor: grabbing; outline: 2px solid #2980b9; z-index: 1000; }
                [contenteditable="true"] { outline: 2px solid #e74c3c !important; box-shadow: 0 0 10px rgba(231, 76, 60, 0.5); cursor: text; }
                .${this.config.classes.guide} { position: fixed; background-color: #e74c3c; z-index: 9999; display: none; }
                #${this.config.ids.vGuide} { width: 1px; height: 100%; top: 0; }
                #${this.config.ids.hGuide} { height: 1px; width: 100%; left: 0; }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        }

        _createUI() {
            const toolbar = document.createElement('div');
            toolbar.id = this.config.ids.toolbar;
            const downloadBtn = document.createElement('button');

            const downloadIconSVG = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            `;
            downloadBtn.innerHTML = `${downloadIconSVG} <span>Download HTML</span>`;
            downloadBtn.addEventListener('click', this._handleDownload.bind(this));

            toolbar.appendChild(downloadBtn);
            document.body.appendChild(toolbar);

            this.vGuide = document.createElement('div');
            this.vGuide.id = this.config.ids.vGuide;
            this.vGuide.className = this.config.classes.guide;
            this.hGuide = document.createElement('div');
            this.hGuide.id = this.config.ids.hGuide;
            this.hGuide.className = this.config.classes.guide;
            document.body.appendChild(this.vGuide);
            document.body.appendChild(this.hGuide);
        }

        _makeElementsEditable() {
            document.querySelectorAll('body *').forEach(el => {
                const isEditorElement = el.id === this.config.ids.toolbar || el.closest(`#${this.config.ids.toolbar}`) || el.tagName === 'SCRIPT' || el.classList.contains(this.config.classes.guide);
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
            if (e.button !== 0 || e.target.isContentEditable) return;
            const target = e.target.closest(this.config.selectors.editable);
            if (target) {
                e.preventDefault();
                this.draggedElement = target;
                this.draggedElement.classList.add(this.config.selectors.dragging.substring(1));

                const computedStyle = window.getComputedStyle(this.draggedElement);
                if (computedStyle.position === 'static') {
                    this.draggedElement.style.position = 'relative';
                }

                this.initialMouseX = e.clientX;
                this.initialMouseY = e.clientY;
                this.startLeft = parseFloat(computedStyle.left) || 0;
                this.startTop = parseFloat(computedStyle.top) || 0;
                this.initialRect = this.draggedElement.getBoundingClientRect();

                this.staticElementsCoords = Array.from(document.querySelectorAll(this.config.selectors.editable))
                    .filter(el => el !== this.draggedElement)
                    .map(el => {
                        const r = el.getBoundingClientRect();
                        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2 };
                    });
            }
        }

        _handleMouseMove(e) {
            if (!this.draggedElement) return;
            e.preventDefault();

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
        }

        _handleMouseUp() {
            if (this.draggedElement) {
                this.draggedElement.classList.remove(this.config.selectors.dragging.substring(1));
                this.draggedElement = null;
                this.vGuide.style.display = 'none';
                this.hGuide.style.display = 'none';
            }
        }

        _handleDoubleClick(e) {
            const target = e.target;
            if (target.closest(this.config.selectors.editable) && !target.isContentEditable && target.children.length === 0) {
                e.stopPropagation();
                target.contentEditable = true;
                target.focus();
                document.execCommand('selectAll', false, null);
            }
        }

        _handleBlur(e) {
            if (e.target.isContentEditable) {
                e.target.contentEditable = false;
            }
        }

        _handleDownload() {
            const pageClone = document.documentElement.cloneNode(true);

            pageClone.querySelector(`#${this.config.ids.toolbar}`)?.remove();
            pageClone.querySelector('#web-editor-script')?.remove();
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

        // --- HELPER LOGIC ---
        _calculateSnapPoints(currentRect, { newLeft, newTop }) {
            let bestSnap = {
                v: { dist: Infinity, pos: 0, guide: 0 },
                h: { dist: Infinity, pos: 0, guide: 0 }
            };

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
            this.vGuide.style.display = 'none';
            this.hGuide.style.display = 'none';
            if (snap.v.dist < this.config.snapThreshold) {
                this.vGuide.style.left = `${snap.v.guide}px`;
                this.vGuide.style.display = 'block';
            }
            if (snap.h.dist < this.config.snapThreshold) {
                this.hGuide.style.top = `${snap.h.guide}px`;
                this.hGuide.style.display = 'block';
            }
        }
    }

    // Initialize the editor
    new WebCanvas();

})();