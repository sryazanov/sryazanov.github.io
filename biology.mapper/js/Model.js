function Model() {
    this._listeners = {
        'status-change': [],
        'mesh-change': [],
        'graphics-change': [],
        'color-change': [],
        'intensities-change': [],
    };
    this._geometry = null;
    this._mesh = null;
    this._spots = null;
    this._mapping = null;
    this._measures = null;
    this._image = null;
    this._activeMeasure = null;
    this._color = new THREE.Color('#001eb2');
    this._colorMap = new Model.JetColorMap();
    this._scaleFunction = Model.Scale.LINEAR;
    this._hotspotQuantile = 0.995;
    this._spotBorder = 0.05;

    this._3DMaterial = new THREE.MeshLambertMaterial({
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 0.9,
        shininess: 3,
        shading: THREE.SmoothShading
    });

    this._status = '';
    this._tasks = {};
}

Model.Scale = {
    LOG: function(x) { return Math.log(1.0 + x); },
    LINEAR: function(x) { return x; },
};

Model.TaskType = {
    LOAD_IMAGE: { key: 'load-image', worker: null },
    LOAD_MESH: { key: 'load-mesh', worker: 'MeshLoader.js' },
    LOAD_MEASURES: { key: 'load-measures', worker: 'MeasuresLoader.js' },
    MAP: { key: 'map', worker: 'Mapper.js' },
};

Model.prototype = {
    addEventListener: function(eventName, listener) {
        this._listeners[eventName].push(listener);
    },

    getStatus: function() {
        return this._status;
    },

    getMesh: function() {
        return this._mesh;
    },

    getMeasures: function() {
        return this._measures || [];
    },

    getImageSize: function() {
        return this._image && {width: this._image.width, height: this._image.height};
    },

    buildSVG: function(document) {
        if (!this._image) return null;
        var SVGNS = 'http://www.w3.org/2000/svg';
        var groupElement = document.createElementNS(SVGNS, 'g');
        var imageElement = document.createElementNS(SVGNS, 'image');
        imageElement.href.baseVal = this._image.url;
        imageElement.width.baseVal.value = this._image.width;
        imageElement.height.baseVal.value = this._image.height;
        groupElement.appendChild(imageElement);

        var defsElement = document.createElementNS(SVGNS, 'defs');
        groupElement.appendChild(defsElement);

        var spotsGroupElement = document.createElementNS(SVGNS, 'g');
        var labelsGroupElement = document.createElementNS(SVGNS, 'g');
        groupElement.appendChild(spotsGroupElement);
        groupElement.appendChild(labelsGroupElement);

        if (this._spots) {
            this._createSVGSpots(spotsGroupElement, labelsGroupElement, defsElement);
            this.recolorSVG(groupElement);
        }

        return groupElement;
    },

    loadImage: function(file) {
        this._setGeometry(null);
        this._cancelTask(Model.TaskType.LOAD_MESH);
        // this._spots = null;
        // this._measures = null;
        this._doTask(Model.TaskType.LOAD_IMAGE, file).then(function(result) {
            this._setImage(result.url, result.width, result.height);
        }.bind(this));
    },

    loadMesh: function(file) {
        this._setGeometry(null);
        this._setImage(null);
        this._cancelTask(Model.TaskType.LOAD_IMAGE);
        this._spots = null;
        this._measures = null;
        this._doTask(Model.TaskType.LOAD_MESH, file).then(function(result) {
            var geometry = new THREE.BufferGeometry();
            for (var name in event.data.attributes) {
                var attribute = event.data.attributes[name];
                geometry.addAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
            }
            this._recolorGeometry(geometry, null, null);
            this._setGeometry(geometry, this._3DMaterial);
            this.map();
        }.bind(this));
    },

    loadIntensities: function(file) {
        this._doTask(Model.TaskType.LOAD_MEASURES, file).then(function(result) {
            this._spots = result.spots;
            this._measures = result.measures;
            this._activeMeasure = null;
            if (this._mesh)
                this.map();
            else if (this._image)
                this._notifyChange('graphics-change');
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
        var args = {
            verteces: this._geometry.getAttribute('original-position').array,
            spots: this._spots
        };
        this._doTask(Model.TaskType.MAP, args).then(function(results) {
            this._mapping = {
                    closestSpotIndeces: event.data.closestSpotIndeces,
                    closestSpotDistances: event.data.closestSpotDistances
            };
            this._recolor();
            this._mapper = null;
        }.bind(this));
    },

    _createSVGSpots: function(spotsGrpupElement, lablesGroupElement, defsElement) {
        var SVGNS = 'http://www.w3.org/2000/svg';

        var document = spotsGrpupElement.ownerDocument;

        for (var i = 0; i < this._spots.length; i++) {
            var spot = this._spots[i];

            var gradientElement = document.createElementNS(SVGNS, 'radialGradient');
            gradientElement.cx.baseVal = "50%";
            gradientElement.cy.baseVal = "50%";
            gradientElement.r.baseVal = "50%";
            gradientElement.fx.baseVal = "50%";
            gradientElement.fy.baseVal = "50%";
            gradientElement.id = "spot" + i;

            gradientElement.innerHTML = '<stop offset="0%" />' +
                                        '<stop offset="100%" />';
            defsElement.appendChild(gradientElement);

            var spotElement = document.createElementNS(SVGNS, 'ellipse');
            spotElement.rx.baseVal.value = spot.r;
            spotElement.ry.baseVal.value = spot.r;
            spotElement.cx.baseVal.value = spot.x;
            spotElement.cy.baseVal.value = spot.y;
            spotElement.style.fill = 'url(#spot' + i + ')';
            spotsGrpupElement.appendChild(spotElement);

            var labelElement = document.createElementNS(SVGNS, 'text');
            labelElement.textContent = spot.name;
            labelElement.setAttribute('x', spot.x + 5);
            labelElement.setAttribute('y', spot.y);
            lablesGroupElement.appendChild(labelElement);
        }
    },

    _cancelTask: function(taskType) {
        if (taskType.key in this._tasks) {
            this._tasks[taskType.key].worker.terminate();
            delete this._tasks[taskType.key];
        }
    },

    _doTask: function(taskType, args) {
        if (taskType.key in this._tasks) this._cancelTask(taskType);

        var task = {
            worker: typeof taskType.worker == 'function' ?
                    new taskType.worker() : new Worker('js/workers/' + taskType.worker),
            status: '',
            cancel: this._cancelTask.bind(this, taskType),
            startTime: new Date().valueOf(),
        };
        this._tasks[taskType.key] = task;
        var setStatus = this._setStatus.bind(this);

        task.worker.postMessage(args);
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

    _setGeometry: function(geometry, material) {
        this._geometry = geometry;
        this._mesh = geometry ? new THREE.Mesh(geometry, material) : null;
        this._notifyChange('mesh-change');
    },

    _setImage: function(url, width, height) {
        if (this._image) {
            URL.revokeObjectURL(this._image.url);
        }
        if (url) {
            this._image = {
                url: url,
                width: width,
                height: height,
            };
        } else {
            this._image = null;
        }
        this._notifyChange('graphics-change');
    },

    _updateIntensities: function() {
        if (!this._activeMeasure || !this._spots) return;

        // Apply the scale function.
        var values = Array.prototype.slice.call(this._activeMeasure.values, 0, this._spots.length);
        values = values.map(this._scaleFunction);

        // Make a copy without NaNs and inifinities. Sort it.
        var sorted = values.filter(function(x) { return x > -Infinity && x < Infinity; }).sort();
        var min = sorted.length > 0 ? sorted[0] : NaN;
        var max = sorted.length > 0 ? sorted[Math.ceil((values.length - 1) * this._hotspotQuantile)] : NaN;

        for (var i = 0; i < values.length; i++) {
            var v = values[i];
            this._spots[i].intensity = isNaN(v) || v == -Infinity ? NaN : Math.min(1.0, (v - min) / (max - min));
        }
        this._recolor();
    },

    _recolor: function() {
        if (this._geometry) {
            this._recolorGeometry(this._geometry, this._mapping, this._spots);
        }
        this._notifyChange('color-change');
    },

    recolorSVG: function(svg) {
        var startTime = new Date();

        var gradients = svg.getElementsByTagName('radialGradient');
        var intensityColor = new THREE.Color();
        for (var i = 0; i < gradients.length; i++) {
            var g = gradients[i];
            var stop0 = gradients[i].children[0];
            var stop1 = gradients[i].children[1];

            var spot = this._spots[i];
            if (spot && !isNaN(spot.intensity)) {
                this._colorMap.map(intensityColor, spot.intensity);
                stop0.style.stopColor = stop1.style.stopColor = intensityColor.getStyle();
                stop0.style.stopOpacity = 1.0;
                stop1.style.stopOpacity = this._spotBorder;
            } else {
                stop0.style.stopColor = stop1.style.stopColor = '';
                stop0.style.stopOpacity = stop1.style.stopOpacity = 0;
            }
        }

        var endTime = new Date();
        console.log('Recoloring time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
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
            if (index >= 0 && !isNaN(spots[index].intensity)) {
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

Model.ImageLoader = function() {
    this.onmessage = null;
    this._reader = new FileReader();
    this._reader.onload = this._onFileLoad.bind(this);
    this._image = new Image();
    this._image.onload = this._onImageLoad.bind(this);
    this._terminated = false;
    this._url = null;
    this._fileType = null;
};

Model.TaskType.LOAD_IMAGE.worker = Model.ImageLoader;

Model.ImageLoader.prototype = {
    terminate: function() {
        this._terminated = true;
        this._reader.abort();
        if (this._url) {
            URL.revokeObjectURL(this._url);
            this._url = null;
        }
    },

    postMessage: function(file) {
        this._fileType = file.type;
        this._reader.readAsArrayBuffer(file);
    },

    _send: function(message) {
        if (!this._terminated || this.onmessage)
            this.onmessage({data: message});
    },

    _onFileLoad: function(event) {
        var blob = new Blob([event.target.result], {type: this._fileType});
        this._url = URL.createObjectURL(blob);
        this._image.src = this._url;
    },

    _onImageLoad: function(event) {
        var url = this._url;
        this._url = null; // Ownership transfered.
        this._send({
                status: 'completed',
                url: url,
                width: this._image.width,
                height: this._image.height
        });
        this._image.src = '';
    },
};