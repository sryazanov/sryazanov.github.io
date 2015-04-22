'use strict'

class View2D {
    constructor(model, canvas) {
        this._scene = new THREE.Scene();
        this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100.0);
        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas
        });
        this._camera.position.z = 10.0;
        
        this._model.addEventListener('geometry-change', this._onModelGeometryChange.bind(this));
        this._model.addEventListener('status-change', this._onModelStatusChange.bind(this));
        this._model.addEventListener('color-change', this.redraw.bind(this));
        this._model.addEventListener('intensities-change', this._onModelIntencitiesChange.bind(this));
    }
}