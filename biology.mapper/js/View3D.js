function View3D(model, canvas) {
    this._renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._mesh = null;
    
    // Binding with model.
    this._model = model;
    this._model.addEventListener('mesh-change', this._onModelMeshChange.bind(this));
    this._model.addEventListener('color-change', this.redraw.bind(this));
    
    // Light
    var pointLight = new THREE.PointLight(0xffffff, 1000, 100);
    pointLight.position.set(-100, 100, 500);
    this._scene.add(pointLight);

    var directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(0, 1, 0);
    this._scene.add(directionalLight1);

    var directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set( 0, -1, 0 );
    this._scene.add(directionalLight2);
    
    // Configure scene
    this._scene.add(new THREE.AxisHelper(20));
    
    // Configure camera
    this._camera.position.x = -30;
    this._camera.position.y = 40;
    this._camera.position.z = 30;
    this._camera.lookAt(this._scene.position);

    this._controls = new THREE.OrbitControls(this._camera, canvas);
    this._controls.target = this._scene.position;
    this._controls.update();
    this._controls.addEventListener('change', this.redraw.bind(this));
}

View3D.prototype = {
    redraw: function() {
        this._renderer.render(this._scene, this._camera);
    },
    
    resize: function(width, height) {
        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);
        this.redraw();
    },
    
    _onModelMeshChange: function() {
        if (this._mesh) {
            this._scene.remove(this._mesh);
        }
        var mesh = this._model.getMesh();
        if (mesh) {
            this._mesh = mesh;
            this._scene.add(mesh);
        }
        this.redraw();
    },
};