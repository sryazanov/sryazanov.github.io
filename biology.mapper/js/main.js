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
    $('#load-mesh-button').click(this._onLoadMeshButtonClick.bind(this));
    $('#load-spots-button').click(this._onLoadSpotsButtonClick.bind(this));
    $('#map-button').click(this._onMapButtonClick.bind(this));

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

    loadMesh: function(file) {
        this._loadFile(file, 'MeshLoader.js').then(function(result) {
            var geometry = new THREE.BufferGeometry();
            for (var name in event.data.attributes) {
                var attribute = event.data.attributes[name];
                geometry.addAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
            }
            this.setGeometry(geometry);
            this.redraw();
        }.bind(this));
    },

    loadSpots: function(file) {
        this._loadFile(file, 'SpotsLoader.js').then(function(result) {
            if (result.data) {
                this._spots = result.data;
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

    getGeometry: function() {
        return this._mesh ? this._mesh.geometry : null;
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

    _loadFile: function(file, worker) {
        if (this.fileLoader_) {
            this.fileLoader_.terminate();
        }
        var worker = new Worker('js/workers/' + worker);
        this.fileLoader_ = worker;
        return new Promise(function(resolve, reject) {
            worker.addEventListener('message', function(event) {
                if (this.fileLoader_) {
                    this.fileLoader_.terminate();
                    this.fileLoader_ = null;
                }
                if (event.data.status == 'success') {
                    resolve(event.data);
                }
            });
            worker.postMessage(file);
        });
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
        this._openFile().then(this.loadMesh.bind(this));
    },

    _onLoadSpotsButtonClick: function() {
        this._openFile().then(this.loadSpots.bind(this));
    },

    _onMapButtonClick: function() {
        var geometry = this.getGeometry();
        var worker = new Worker('js/workers/Mapper.js');
        worker.postMessage({
            verteces: geometry.getAttribute('original-position').array,
            spots: this._spots
        });
        worker.addEventListener('message', function(event) {
            var geometry = this.getGeometry();
            if (event.data.status = 'success') {
                if (geometry.getAttribute('color')) {
                    var colors = geometry.getAttribute('color');
                    colors.array.set(event.data.colors);
                    colors.needsUpdate = true;
                } else {
                    geometry.addAttrinute('color', new THREE.BufferAttribute(event.data.colors, 3));
                }
                this.redraw();
            }
        }.bind(this));
    },
};

var g_composition;

$(function() {
    g_composition = new Composition(document.body);
    g_composition.resize();
});
