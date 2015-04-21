function Composition(domContainer, model) {
    this._domContainer = domContainer;
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._renderer = new THREE.WebGLRenderer({antialias: true, canvas: this._domContainer.querySelector('canvas')});
    this._mesh = null;

    this._model = model;
    this._model.addEventListener('geometry-change', this._onModelGeometryChange.bind(this));
    this._model.addEventListener('status-change', this._onModelStatusChange.bind(this));
    this._model.addEventListener('color-change', this.redraw.bind(this));
    this._model.addEventListener('intensities-change', this._onModelIntencitiesChange.bind(this));

    // Light
    var pointLight = new THREE.PointLight(0xffffff, 1000, 100);
    pointLight.position.set(-100, 100, 500);
    this._scene.add(pointLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 0);
    this._scene.add(directionalLight);

    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set( 0, -1, 0 );
    this._scene.add( directionalLight );

    this._material = new THREE.MeshLambertMaterial({
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 0.9,
        shininess: 3,
        shading: THREE.SmoothShading
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
    $('#load-measures-button').click(this._onLoadMeasuresButtonClick.bind(this));
    $('#intensity-selection').change(this._onIntensitiesSelectChange.bind(this));
    this._onModelIntencitiesChange();

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

    _onModelIntencitiesChange: function() {
        var options = $('#intensity-selection');
        options.empty();
        $.each(this._model.getMeasures(), function() {
            options.append($("<option />").val(this.index).text(this.name));
        });
        this._model.selectMeasure(options.val());
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
        for (var i = 0; i < event.dataTransfer.files.length; i++) {
            var file = event.dataTransfer.files[i];

            if (/\.stl$/i.test(file.name)) {
                this._model.loadGeometry(file);
            } else if (/\.csv$/i.test(file.name)) {
                this._model.loadMeasures(file);
            }
        }
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

    _onLoadMeasuresButtonClick: function() {
        this._openFile().then(this._model.loadMeasures.bind(this._model));
    },

    _onIntensitiesSelectChange: function() {
        var name = $('#intensity-selection').val();
        this._model.selectMeasure(name);
    },
};

var g_model = new Model();

$(function() {
    var composition = new Composition(document.body, g_model);
    composition.resize();
});
