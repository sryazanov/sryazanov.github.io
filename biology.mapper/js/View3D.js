function View3D(model, canvas) {
    this._canvas = canvas;
    this._renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._mesh = null;
    
    // Binding with model.
    this._model = model;
    this._model.addEventListener('mode-change', this._onModelModeChange.bind(this));
    this._model.addEventListener('3d-scene-change', this._onSceneChange.bind(this));
    
    // Configure camera
    this._camera.position.x = -30;
    this._camera.position.y = 40;
    this._camera.position.z = 30;
    this._camera.lookAt(this._model.scene.position);

    this._controls = new THREE.OrbitControls(this._camera, canvas);
    this._controls.target = this._model.scene.position;
    this._controls.update();
    this._controls.addEventListener('change', this.redraw.bind(this));
}

View3D.prototype = {
    redraw: function() {
        this._renderer.render(this._model.scene, this._camera);
    },
    
    resize: function(width, height) {
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setPixelRatio(devicePixelRatio);
        this._renderer.setSize(width, height);
        this.redraw();
    },

    _onModelModeChange: function() {
        this._canvas.hidden = this._model.mode != Model.Mode.MODE_3D;
    },

    _onSceneChange: function() {
        this.redraw();
    },
};