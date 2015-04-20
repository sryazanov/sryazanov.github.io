function Model() {
    this._listeners = {
        'status-change': [],
        'geometry-change': [],
        'color-change': [],
        'intensities-change': [],
    };
    this._geometry = null;
    this._spots = null;
    this._mapping = null;
    this._color = new THREE.Color('#001eb2');
    this._colorMap = new Model.JetColorMap();
    this._scaleFunction = Math.log;
    this._hotspotQuantile = 0.995;

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

    getMeasureNames: function() {
        return this._intensities ? this._intensities.measureNames : [];
    },

    loadGeometry: function(file) {
        if (this._geometryLoader) {
            this._geometryLoader.cancel();
        }
        this._geometryLoader = this._loadFile(file, 'MeshLoader.js').then(function(result) {
            this._geometryLoader = null;
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
        if (this._spotsLoader) {
            this._spotsLoader.cancel();
        }
        this._spotsLoader = this._loadFile(file, 'SpotsLoader.js').then(function(result) {
            this._spotsLoader = null;
            if (result.data) {
                this._spots = result.data;
                this.map();
            }
        }.bind(this));
    },

    loadIntensities: function(file) {
        if (this._intensitiesLoader) {
            this._intensitiesLoader.terminate();
        }
        this._intensitiesLoader = this._loadFile(file, 'IntensitiesLoader.js').then(function(result) {
            this._intensitiesLoader = null;
            if (result.status == 'success') {
                this._intensities = {
                    measureNames: result.measureNames,
                    measures: result.measures,
                    spots: result.spots,
                };
                this._notifyChange('intensities-change');
            }
        }.bind(this));
    },

    selectMeasure: function(name) {
        if (!this._intensities) return;

        var measure = this._intensities.measures[name];
        if (!measure) return;

        // Apply the scale function.
        measure = Array.prototype.map.call(measure, this._scaleFunction);

        // Create map from spot name to spot.
        var spotsMap = this._spots.reduce(function(h, e) { h[e.name] = e; return h; }, {});

        // Array of references to stops.
        var spots = this._intensities.spots.map(function(x) {return spotsMap[x];});

        var max = measure.slice().sort()[Math.ceil((measure.length - 1) * this._hotspotQuantile )];

        for (var i = 0; i < measure.length; i++) {
            spots[i].intensity = Math.min(1.0, measure[i] / max);
        }
        this._recolor();
    },

    map: function() {
        if (!this._geometry || !this._spots) return;
        if (this._mapper) {
            this._mapper.cancel();
        }

        this._setStatus('Mapping...');
        var geometry = this.getGeometry();
        var worker = new Worker('js/workers/Mapper.js');
        this._mapper = {
            cancel: function() {
                worker.terminate();
            }
        };
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
                this._mapper = null;
                worker.terminate();
            }
        }.bind(this));
    },

    _loadFile: function(file, worker) {
        var worker = new Worker('js/workers/' + worker);
        var promise = new Promise(function(resolve, reject) {
            worker.addEventListener('message', function(event) {
                if (event.data.status == 'success') {
                    resolve(event.data);
                    worker.terminate();
                }
            });
            worker.postMessage(file);
        });
        promise.cancel = function() {
            worker.terminate();
        };
        return promise;
    },

    _recolor: function() {
        this._recolorGeometry(this._geometry, this._mapping, this._spots);
        this._notifyChange('color-change');
    },

    _recolorGeometry: function(geometry, mapping, spots) {
        var startTime = new Date();

        var position = geometry.getAttribute('position');
        var positionCount = position.array.length / position.itemSize;

        var intensityColor = new THREE.Color();
        var currentColor = new THREE.Color();

        if (!geometry.getAttribute('color')) {
            geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(positionCount * 3), 3));
        }
        var color = geometry.getAttribute('color').array;

        for (var i = 0; i < positionCount; i++) {
            var index = mapping ? mapping.closestSpotIndeces[i] : -1;
            currentColor.set(this._color);
            if (index >= 0) {
                this._colorMap.map(intensityColor, spots[index].intensity);
                var alpha = 1.0 - mapping.closestSpotDistances[i];
                alpha = alpha;
                currentColor.lerp(intensityColor, alpha);
            }

            color[i * 3] = currentColor.r;
            color[i * 3 + 1] = currentColor.g;
            color[i * 3 + 2] = currentColor.b;
        }

        geometry.getAttribute('color').needsUpdate = true;

        var endTime = new Date();
        console.log('Recoloring time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
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
    map: function(color, intensity) {
        if (intensity <= 0.0) {
            color.set(this._colors[0]);
            return;
        }
        if (intensity >= 1.0) {
            color.set(this._colors[this._colors.length - 1]);
            return;
        }

        var position = intensity * (this._colors.length - 1);
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