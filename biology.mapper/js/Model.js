function Model() {
    this._geometry = null;
    this._listeners = {
        'status-change': [],
        'geometry-change': [],
    };
}

Model.prototype = {
    addEventListener: function(eventName, listener) {
        this._listeners[eventName].push(listener)
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
            this.setGeometry(geometry);
        }.bind(this));
    },

    loadSpots: function(file) {
        this._loadFile(file, 'SpotsLoader.js').then(function(result) {
            if (result.data) {
                this._spots = result.data;
            }
        }.bind(this));
    },

    map: function() {
        var geometry = this.getGeometry();
        var worker = new Worker('js/workers/Mapper.js');
        worker.postMessage({
            verteces: geometry.getAttribute('original-position').array,
            spots: this._spots
        });
        worker.addEventListener('message', function(event) {
            // TODO: implement
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

    _notifyChange: function(eventName) {
        var listeners = this._listeners[eventName];
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]();
        }
    }
};