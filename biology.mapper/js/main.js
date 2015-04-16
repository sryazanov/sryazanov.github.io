function mapBiologyData(geometry) {
    var positions = geometry.getAttribute('position');
    var count = positions.length / positions.itemSize;

    if (!geometry.getAttribute('color')) {
        geometry.addAttribute(new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    }

    var colors = geometry.getAttribute('color');
    for (var i = 0; i < count; i++) {
        colors.array[i * 3 + 0] = Math.random();
        colors.array[i * 3 + 1] = Math.random();
        colors.array[i * 3 + 2] = Math.random();
    }
    colors.needsUpdate = true;
}

function Composition(domContainer) {
    this._domContainer = domContainer;
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._renderer = new THREE.WebGLRenderer({canvas: this._domContainer.querySelector('canvas')});
    this._mesh = null;

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    this._scene.add( spotLight );

    this._material = new THREE.MeshLambertMaterial({
        color: 0xffff00,
        emissive: 0x0000ff,
        vertexColors: THREE.VertexColors});

    // Configure scene
    var axes = new THREE.AxisHelper(20);
    this._scene.add(axes);
    this.setGeometry(new THREE.SphereGeometry(4, 20, 20));

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
    this._domContainer.querySelector('#load-mesh-button').addEventListener('click', this._onLoadMashButtonClick.bind(this));

    var controls = new THREE.OrbitControls(this._camera, this._domContainer.querySelector('.canvas-container'));
    controls.target = this._scene.position;
    controls.update();
    controls.addEventListener('change', this.redraw.bind(this));

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

    loadFile: function(file) {
        if (this.fileLoader_) {
            this.fileLoader_.terminate();
        }
        this.fileLoader_ = new Worker('js/workers/MeshLoader.js');
        this.fileLoader_.postMessage(file);
        this.fileLoader_.addEventListener('message', function(event) {
            if (event.data.status == 'success') {
                var geometry = new THREE.BufferGeometry();
                for (var name in event.data.attributes) {
                    var attribute = event.data.attributes[name];
                    geometry.addAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
                }
                this.setGeometry(geometry);
                this.redraw();
            }
        }.bind(this));
    },

    setGeometry: function(geometry) {
        if (this._mesh) {
            this._scene.remove(this._mesh);
        }
        this._mesh = new THREE.Mesh(geometry, this._material);
        this._scene.add(this._mesh);
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

    _onLoadMashButtonClick: function() {
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.addEventListener('change', function(event) {
            this.loadFile(fileInput.files[0]);
        }.bind(this));
        fileInput.click();
    },
};

var g_composition;

$(function() {
    g_composition = new Composition(document.body);
    g_composition.resize();
});
