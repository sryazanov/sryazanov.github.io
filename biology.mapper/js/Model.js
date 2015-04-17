function Model() {
    this._listeners = {
        'status-change': [],
        'geometry-change': [],
        'uv-mapping-change': []
    };
    this._geometry = null;
    this._spots = null;
    this._mapping = null;

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
            this._repaintGeometry(geometry, null, null);
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
                this._repaint();
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

    _repaint: function() {
        this._repaintGeometry(this._geometry, this._mapping, this._intencity);
        this._notifyChange('uv-mapping-change');
    },

    _repaintGeometry: function(geometry, mapping, intencity) {
        var startTime = new Date();

        var position = geometry.getAttribute('position');
        var positionCount = position.array.length / position.itemSize;

        if (!geometry.getAttribute('uv')) {
            geometry.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(positionCount * 2), 2));
        }
        var uv = geometry.getAttribute('uv').array;

        for (var i = 0; i < positionCount; i++) {
            var index = mapping ? mapping.closestSpotIndeces[i] : -1;
            if (index < 0) {
                uv[i + i] = uv[i + i + 1] = 1.0;
            } else {
                uv[i + i] = mapping.closestSpotDistances[i];
                uv[i + i + 1] = intencity[index];
            }
        }

        geometry.getAttribute('uv').needsUpdate = true;

        var endTime = new Date();
        console.log('UV-mapping time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
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