function Composition(domContainer) {
    this._domContainer = domContainer;
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._renderer = new THREE.WebGLRenderer({antialias: true, canvas: this._domContainer.querySelector('canvas')});
    this._mesh = null;

    this._model = new Model();
    this._model.addEventListener('geometry-change', this._onModelGeometryChange.bind(this));
    this._model.addEventListener('status-change', this._onModelStatusChange.bind(this));
    this._model.addEventListener('uv-mapping-change', this.redraw.bind(this));

    // Light
    var spotLight = new THREE.PointLight( 0xffffff, 1, 100 );
    spotLight.position.set(-40, 60, -10);
    this._scene.add(spotLight);
    this._scene.add(new THREE.AmbientLight('#404040'));

    var texture = THREE.ImageUtils.loadTexture('img/texture.png', {}, this.redraw.bind(this));
    this._material = new THREE.MeshLambertMaterial({
        color: 0xffff00,
        map: texture
    });

    // Configure scene
    var axes = new THREE.AxisHelper(20);
    this._scene.add(axes);

    // Configure camera
    this._camera.position.x = -30;
    this._camera.position.y = 40;
    this._camera.position.z = 30;
    this._camera.lookAt(this._scene.position);

    window.addEventListener('resize', this.resize.bind(this));
    this._domContainer.addEventListener('dragenter', this._onDragEnter.bind(this));
    this._domContainer.addEventListener('dragleave', this._onDragLeave.bind(this));
    this._domContainer.addEventListener('dragover', this._onDragOver.bind(this));
    this._domContainer.addEventListener('drop', this._onDrop.bind(this));
    $('#load-mesh-button').click(this._onLoadMeshButtonClick.bind(this));
    $('#load-spots-button').click(this._onLoadSpotsButtonClick.bind(this));
    $('#map-button').click(this._onMapButtonClick.bind(this));

    var controls = new THREE.OrbitControls(this._camera, this._domContainer.querySelector('.canvas-container'));
    controls.target = this._scene.position;
    controls.update();
    controls.addEventListener('change', this.redraw.bind(this));

    this._model.setGeometry(new THREE.SphereGeometry(4, 20, 20));

    this.fileLoader_ = null;
}

Composition.prototype = {
    resize: function() {
        var container = this._domContainer.querySelector('.canvas-container');
        var width = container.offsetWidth;
        var height = container.offsetHeight;

        this._camera.aspect = width / height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(width, height);

        this.redraw();
    },

    redraw: function() {
        this._renderer.render(this._scene, this._camera);
    },

    _onModelGeometryChange: function() {
        if (this._mesh) {
            this._scene.remove(this._mesh);
        }
        var geometry = this._model.getGeometry();
        if (geometry) {
            this._mesh = new THREE.Mesh(this._model.getGeometry(), this._material);
            this._scene.add(this._mesh);
        }
        this.redraw();
    },

    _onModelStatusChange: function() {
        $('#status').text(this._model.getStatus());
    },

    _onDragEnter: function(event) {
        // TODO: Show drag visual effect.
    },

    _onDragLeave: function(event) {
        // TODO: Remove drag visual effect.
    },

    _onDragOver: function(event) {
        // TODO: Add filtering by file type.
        event.preventDefault();
    },

    _onDrop: function(event) {
        event.preventDefault();
        event.stopPropagation();
        this.loadFile(event.dataTransfer.files[0]);
    },

    _openFile: function() {
        return new Promise(function(resolve) {
            var fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.addEventListener('change', function() {
                resolve(fileInput.files[0]);
            });
            fileInput.click();
        });
    },

    _onLoadMeshButtonClick: function() {
        this._openFile().then(this._model.loadGeometry.bind(this._model));
    },

    _onLoadSpotsButtonClick: function() {
        this._openFile().then(this._model.loadSpots.bind(this._model));
    },

    _onMapButtonClick: function() {
        this._model.map();
    },
};

var g_composition;

$(function() {
    g_composition = new Composition(document.body);
    g_composition.resize();
});
