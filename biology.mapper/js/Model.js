function Model() {
    this._listeners = {
        'status-change': [],
        'geometry-change': [],
        'color-change': []
    };
    this._geometry = null;
    this._spots = null;
    this._mapping = null;
    this._colorMap = new Model.JetColorMap();

    this._status = '';
}

Model.prototype = {
    addEventListener: function(eventName, listener) {
        this._listeners[eventName].push(listener)
    },

    getStatus: function() {
        return this._status;
    },

    getGeometry: function() {
        return this._geometry;
    },

    setGeometry: function(geometry) {
        this._geometry = geometry;
        this._notifyChange('geometry-change');
    },

    loadGeometry: function(file) {
        this._loadFile(file, 'MeshLoader.js').then(function(result) {
            var geometry = new THREE.BufferGeometry();
            for (var name in event.data.attributes) {
                var attribute = event.data.attributes[name];
                geometry.addAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
            }
            this._recolorGeometry(geometry, null, null);
            this.setGeometry(geometry);
            this.map();
        }.bind(this));
    },

    loadSpots: function(file) {
        this._loadFile(file, 'SpotsLoader.js').then(function(result) {
            if (result.data) {
                this._spots = result.data;

                this._intencity = new Array(this._spots.length);
                for (var i = 0; i < this._intencity.length; i++)
                    this._intencity[i] = Math.random();

                this.map();
            }
        }.bind(this));
    },

    map: function() {
        if (!this._geometry || !this._spots) return;

        this._setStatus('Mapping...');
        var geometry = this.getGeometry();
        var worker = new Worker('js/workers/Mapper.js');
        worker.postMessage({
            verteces: geometry.getAttribute('original-position').array,
            spots: this._spots
        });
        worker.addEventListener('message', function(event) {
            if (event.data.status == 'calculating') {
                this._setStatus('Mapping: ' + event.data.progress + '%');
            } else if (event.data.status = 'completed') {
                this._mapping = {
                    closestSpotIndeces: event.data.closestSpotIndeces,
                    closestSpotDistances: event.data.closestSpotDistances
                };
                this._setStatus('Mapping completed.');
                this._recolor();
            }
        }.bind(this));
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

    _recolor: function() {
        this._recolorGeometry(this._geometry, this._mapping, this._intencity);
        this._notifyChange('color-change');
    },

    _recolorGeometry: function(geometry, mapping, intencity) {
        var startTime = new Date();

        var position = geometry.getAttribute('position');
        var positionCount = position.array.length / position.itemSize;

        var defaultColor = new THREE.Color('#2020ff');
        var intencityColor = new THREE.Color('#ff0000');
        var currentColor = new THREE.Color();

        if (!geometry.getAttribute('color')) {
            geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(positionCount * 3), 3));
        }
        var color = geometry.getAttribute('color').array;

        for (var i = 0; i < positionCount; i++) {
            var index = mapping ? mapping.closestSpotIndeces[i] : -1;
            currentColor.set(defaultColor);
            if (index >= 0) {
                this._colorMap.map(intencityColor, intencity[index]);
                var alpha = 1.0 - mapping.closestSpotDistances[i];
                alpha = alpha;
                currentColor.lerp(intencityColor, alpha);
            }

            color[i * 3] = currentColor.r;
            color[i * 3 + 1] = currentColor.g;
            color[i * 3 + 2] = currentColor.b;
        }

        geometry.getAttribute('color').needsUpdate = true;

        var endTime = new Date();
        console.log('Recoloring time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
    },

    createColorMap: function() {
        var points = ['#00007F', 'blue', '#007FFF','cyan', '#7FFF7F', 'yellow', '#FF7F00', 'red', '#7F0000'];

        this._colorMap = new Array(1024);
        for (var i = 0; i < this._colorMap.length; i++) {
            var chunk = Math.cail(i * points.length / this._colorMap.length);
            var color1 = new THREE.Color(points[chunk]);
            var color2 = new THREE.Color(points[chunk + 1]);
            var alpha = (i - chunk * points.length / this._colorMap.length);
        }
    },

    _setStatus: function(status) {
        this._status = status;
        this._notifyChange('status-change');
    },

    _notifyChange: function(eventName) {
        var listeners = this._listeners[eventName];
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]();
        }
    }
};

Model.ColorMap = function(colorValues) {
    this._colors = new Array(colorValues.length);
    for (var i = 0; i < this._colors.length; i++) {
        this._colors[i] = new THREE.Color(colorValues[i]);
    }
};

Model.ColorMap.prototype = {
    map: function(color, intencity) {
        if (intencity <= 0.0) {
            color.set(this._colors[0]);
            return;
        }
        if (intencity >= 1.0) {
            color.set(this._colors[this._colors.length - 1]);
            return;
        }

        var position = intencity * (this._colors.length - 1);
        var index = Math.floor(position);
        var alpha = position - index;

        color.set(this._colors[index]);
        color.lerp(this._colors[index + 1], alpha);
    }
};

Model.JetColorMap = function() {
    Model.ColorMap.call(this, ['#00007F', 'blue', '#007FFF','cyan', '#7FFF7F', 'yellow', '#FF7F00', 'red', '#7F0000']);
};

Model.JetColorMap.prototype = {
    __proto__: Model.ColorMap.prototype
};