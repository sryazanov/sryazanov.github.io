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
    this._measures = null;
    this._activeMeasure = null;
    this._color = new THREE.Color('#001eb2');
    this._colorMap = new Model.JetColorMap();
    this._scaleFunction = Model.Scale.LINEAR;
    this._hotspotQuantile = 0.995;
    this._spotBorder = 0.05;

    this._status = '';
    this._tasks = {};
}

Model.Scale = {
    LOG: function(x) { return Math.log(1.0 + x); },
    LINEAR: function(x) { return x; },
};

Model.TaskType = {
    LOAD_MESH: { key: 'load-mesh', worker: 'MeshLoader.js' },
    LOAD_MEASURES: { key: 'load-measures', worker: 'MeasuresLoader.js' },
    MAP: { key: 'map', worker: 'Mapper.js' },
};

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

    getMeasures: function() {
        return this._measures || [];
    },

    loadGeometry: function(file) {
        this.setGeometry(null);
        this._spots = null;
        this._measures = null;
        this._doTask(Model.TaskType.LOAD_MESH, file).then(function(result) {
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

    loadMeasures: function(file) {
        this._doTask(Model.TaskType.LOAD_MEASURES, file).then(function(result) {
            this._spots = result.spots;
            this._measures = result.measures;
            this._activeMeasure = null;
            this.map();
            this._notifyChange('intensities-change');
        }.bind(this));
    },

    selectMeasure: function(name) {
        if (!this._measures) return;

        this._activeMeasure = this._measures[name];
        this._updateIntensities();
    },

    setHotspotQuantile: function(value) {
        if (this._hotspotQuantile == value) return;
        if (value < 0.0) value = 0.0;
        if (value > 1.0) value = 1.0;
        this._hotspotQuantile = value;
        this._updateIntensities();
    },

    setScaleFunction: function(value) {
        if (this._scaleFunction == value) return;
        this._scaleFunction = value;
        this._updateIntensities();
    },

    setColor: function(value) {
        this._color = value;
        this._recolor();
    },

    setSpotBorder: function(value) {
        if (this._spotBorder == value) return;
        if (value < 0.0) value = 0.0;
        if (value > 1.0) value = 1.0;
        this._spotBorder = value;
        this._recolor();
    },

    map: function() {
        if (!this._geometry || !this._spots) return;
        var arguments = {
            verteces: this._geometry.getAttribute('original-position').array,
            spots: this._spots
        };
        this._doTask(Model.TaskType.MAP, arguments).then(function(results) {
            this._mapping = {
                    closestSpotIndeces: event.data.closestSpotIndeces,
                    closestSpotDistances: event.data.closestSpotDistances
                };
                this._recolor();
                this._mapper = null;
        }.bind(this));
    },

    _cancelTask: function(taskType) {
        if (taskType.key in this._tasks) {
            this._tasks[taskType.key].worker.terminate();
            delete this._tasks[taskType.key];
        }
    },

    _doTask: function(taskType, arguments) {
        if (taskType.key in this._tasks) this._cancelTask(taskType);

        var task = {
            worker: new Worker('js/workers/' + taskType.worker),
            status: '',
            cancel: this._cancelTask.bind(this, taskType),
            startTime: new Date().valueOf(),
        };
        this._tasks[taskType.key] = task;
        var setStatus = this._setStatus.bind(this);

        task.worker.postMessage(arguments);
        return new Promise(function(resolve, reject) {
            task.worker.onmessage = function(event) {
                if (event.data.status == 'completed') {
                    setStatus('');
                    resolve(event.data);
                    task.cancel();
                    console.info('Task ' + taskType.key + ' completed in ' + (new Date().valueOf() - task.startTime) / 1000 + ' sec');
                } else if (event.data.status == 'failed') {
                    reject(event.data);
                    task.cancel();
                    alert('Operation failed: ' + event.message);
                } else if (event.data.status == 'working') {
                    setStatus(event.data.message);
                }
            };
            task.worker.onerror = function(event) {
                alert('Operation failed. See log for details.');
            };
        });
    },

    _updateIntensities: function() {
        if (!this._activeMeasure || !this._spots) return;

        // Apply the scale function.
        var values = Array.prototype.slice.call(this._activeMeasure.values, 0, this._spots.length);
        values = values.map(this._scaleFunction);

        var max = values.slice().sort()[Math.ceil((values.length - 1) * this._hotspotQuantile )];

        for (var i = 0; i < values.length; i++) {
            this._spots[i].intensity = Math.min(1.0, values[i] / max);
        }
        this._recolor();
    },

    _recolor: function() {
        this._recolorGeometry(this._geometry, this._mapping, this._spots);
        this._notifyChange('color-change');
    },

    _recolorGeometry: function(geometry, mapping, spots) {
        if (!geometry) return;

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
                var alpha = 1.0 - (1.0 - this._spotBorder) * mapping.closestSpotDistances[i];
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