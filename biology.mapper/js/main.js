function RotationController(element, initialRotation) {
	element.addEventListener('mousedown', this._onMouseDown.bind(this), false);
	element.addEventListener('mousewheel', this._onMouseWheel.bind(this), false);
	this._state = null;
}

RotationController.prototype = {
	_onMouseDown: function(event) {
		this._state = {
			handlers: {
				'mousemove': this._onMouseMove.bind(this),
				'mouseup': this._onMouseUp.bind(this),
			},
			initialX: event.x,
			initialY: event.y,
			currentX: event.x,
			currentY: event.y,
		};
		for (var e in this._state.handlers) {
			document.addEventListener(e, this._state.handlers[e]);
		}
	},

	_onMouseMove: function(event) {
		this.onrotate({
			x: (event.x - this._state.currentX) / 100,
			y: (event.y - this._state.currentY) / 100,
			distance: 0
		});
		this._state.currentX = event.x;
		this._state.currentY = event.y;
	},

	_onMouseUp: function(event) {
		for (var e in this._state.handlers) {
			document.removeEventListener(e, this._state.handlers[e]);
		}
		this._handlers = null;
	},

	_onMouseWheel: function(event) {
		this.onrotate({
			x: 0,
			y: 0,
			distance: -event.wheelDelta / 10
		});
	},

	onrotate: function(rotation) {}
};

function Composition(domContainer) {
    this._domContainer = domContainer;
    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this._renderer = new THREE.WebGLRenderer({canvas: this._domContainer.querySelector('canvas')});
    this._mesh = null;

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    this._scene.add( spotLight );

    this._material = new THREE.MeshLambertMaterial({color: 0xffff00});
    this._material.emissive = new THREE.Color(0x0000ff);

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
    this._domContainer.addEventListener('drop', this._onDrop.bind(this));
    this._domContainer.querySelector('#load-mesh-button').addEventListener('click', this._onLoadMashButtonClick.bind(this));

    var controller = new RotationController(this._domContainer.querySelector('.canvas-container'));
    controller.onrotate = this._onRotate.bind(this);
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
        var reader = new FileReader();
        reader.addEventListener('load', function(event) {
            this.readSTL(event.target.result, file.name);
        }.bind(this));
        reader.readAsBinaryString(file);
    },

    readSTL: function(contents, fileName) {
    	var contents = event.target.result;
		var geometry = new THREE.STLLoader().parse(contents);
		geometry.sourceType = "stl";
		geometry.sourceFile = fileName;

		var center = geometry.center();

		this.setGeometry(geometry);
		this.redraw();
	},

    setGeometry: function(geometry) {
        if (this._mesh) {
            this._scene.remove(this._mesh);
        }
        this._mesh = new THREE.Mesh(geometry, this._material);
        this._scene.add(this._mesh);
    },

    _onDrop: function(event) {
        event.preventDefault();
		event.stopPropagation();
		this.loadFile(event.dataTransfer.files[0]);
    },

    _onLoadMashButtonClick: function() {
        var fileInput = document.createElement( 'input' );
	   fileInput.type = 'file';
	   fileInput.addEventListener('change', function(event) {
	       this.loadFile(fileInput.files[0]);
	   }.bind(this));
	   fileInput.click();
    },

    _onRotate: function(rotation) {
    	if (!this._mesh) return;

    	this._mesh.rotation.x += rotation.x;
    	this._mesh.rotation.y += rotation.y;

    	if (rotation.distance) {
    		var distance = this._camera.position.length() + rotation.distance;
    		if (distance < 1)
    			distance = 1;
    		this._camera.position.setLength(distance);
    		this._camera.updateProjectionMatrix();
    	}

    	this.redraw();
    },
};

var g_composition;

$(function() {
    console.log("Loaded");
    g_composition = new Composition(document.body);
    g_composition.resize();
});
