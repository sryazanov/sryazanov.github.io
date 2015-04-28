/**
 * UI control (#map-selector) which let the user to select an active map
 * (measurement). Text input lets type filter for map name. Item list (.items)
 * shows only items that contain the filter's substring (and highlights it).
 *
 * @param {Model} model.
 * @param {HTMLDivElement} div Main HTML element (#map-selector).
 * @mapName {HTMLElement|SGVElement} mapName Element to show current map name.
 */
function MapSelector(model, div, mapName) {
    this._model = model;
    this._div = div;
    this._mapName = mapName;
    this._input = this._div.querySelector('input');
    this._itemsContainer = this._div.querySelector('.items');
    this._filter = '';
    this._effectTimeout = 0;
    this._measures = null;
    this._selectedIndex = -1;
    this._div.style.opacity = 0;
    this._model.addEventListener('intensities-change', this._onModelIntencitiesChange.bind(this));
    this._input.addEventListener('input', this._onInput.bind(this));
    this._input.addEventListener('blur', this._onBlur.bind(this));
    this._input.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._itemsContainer.addEventListener('mousedown', this._onItemMouseDown.bind(this), false);
    this._itemsContainer.addEventListener('click', this._onItemClick.bind(this), false);
    this._onModelIntencitiesChange();
}

MapSelector.prototype = Object.create(null, {
    _onModelIntencitiesChange: {
        value: function() {
            if (!this._model.measures) {
                this._measures = [];
                return;
            }
            var escape = this._escapeHTML.bind(this);

            this._measures = this._model.measures.map(function(x) {
                var e = escape(x.name);
                return {
                    name: x.name,
                    text: e,
                    lower: e.toLowerCase(),
                    index: x.index
                };
            });

            this._selectIndex(this._measures.length ? 0 : -1);

            this._applyFilter();
        }
    },

    filter: {
        get: function() {
            return this._filter;
        },

        set: function(value) {
            this._filter = value;
            this._input.value = value;
            this._applyFilter();
        }
    },

    activate: {
        value: function() {
            this._div.hidden = false;
            this._input.focus();
            this._input.select();
            this._deffer(function() {
                this._div.style.opacity = 1;
            }.bind(this), 0);
        }
    },

    deactivate: {
        value: function() {
            this._div.style.opacity = 0;
            this._deffer(function() {
                this._div.hidden = true;
            }.bind(this), 200);
        }
    },

    _deffer: {
        value: function(fn, timeout) {
            if (this._effectTimeout) clearTimeout(this._effectTimeout);
            this._effectTimeout = setTimeout(function() {
                this._effectTimeout = 0;
                fn();
            }.bind(this), timeout);
        }
    },

    _applyFilter: {
        value: function() {
            var selectedIndex = this._selectedIndex;

            if (!this._filter) {
                this._itemsContainer.innerHTML = this._measures.map(function(x) {
                    return '<div index="' + x.index + '"' + (x.index == selectedIndex ? ' selected' : '') + '>' + x.text + '</div>';
                }).join('')
                return;
            }
            var f = this._escapeHTML(this._filter.toLowerCase());
            var result = [];
            for (var i = 0; i < this._measures.length; i++) {
                var x = this._measures[i];
                var index = x.lower.indexOf(f);
                if (index < 0) continue;
                var highlighted = '<div index="' + x.index + '"' + (x.index == selectedIndex ? ' selected' : '') + '>' +
                        x.text.substr(0, index) + '<b>' + x.text.substr(index, f.length) + '</b>' + x.text.substr(index + f.length) + '</div>';
                result.push(highlighted);
            }
            this._itemsContainer.innerHTML = result.join('');
        }
    },

    selectedItem: {
        get: function() {
            return this._itemsContainer.querySelector('[selected]');
        },

        set: function(value) {
            if (value && value.parentElement != this._itemsContainer) throw 'Invalid parameter';
            var prev = this.selectedItem;
            if (prev) prev.removeAttribute('selected');
            if (value) {
                value.setAttribute('selected', '');
                value.scrollIntoViewIfNeeded();
                this._selectIndex(Number(value.getAttribute('index')));
            }
        }
    },

    _selectIndex: {
        value: function(value) {
            this._selectedIndex = value;
            if (value >= 0) {
                this._model.selectMeasure(value);
                this._mapName.textContent = this._measures[value].name;
            } else {
                this._mapName.textContent = '';
            }
        }
    },

    _onInput: {
        value: function(event) {
            this._filter = this._input.value;
            this._applyFilter();
        }
    },

    _onBlur: {
        value: function(event) {
            this.deactivate();
        }
    },

    _onKeyDown: {
        value: function(event) {
            if (event.keyCode == 38 /* Up */) {
                var prev = this.selectedItem;
                var next = prev ? prev.previousElementSibling : this._itemsContainer.firstElementChild;
                if (next) this.selectedItem = next;
                event.preventDefault();
            } else if (event.keyCode == 40 /* Down */) {
                var prev = this.selectedItem;
                var next = prev ? prev.nextElementSibling : this._itemsContainer.firstElementChild;
                if (next) this.selectedItem = next;
                event.preventDefault();
            } else if (event.keyCode == 33 /* Page up */) {
                var len = Math.max(10, this._itemsContainer.childElementCount / 10);
                if (!len) return;
                var item = this.selectedItem;
                if (!item) item = this._itemsContainer.lastElementChild;
                for (var i = 0; i < len; i++) {
                    if (!item.previousElementSibling) break;
                    item = item.previousElementSibling;
                }
                this.selectedItem = item;
            } else if (event.keyCode == 34 /* Page down */) {
                var len = Math.max(10, this._itemsContainer.childElementCount / 10);
                if (!len) return;
                var item = this.selectedItem;
                if (!item) item = this._itemsContainer.firstElementChild;
                for (var i = 0; i < len; i++) {
                    if (!item.nextElementSibling) break;
                    item = item.nextElementSibling;
                }
                this.selectedItem = item;
            } else if (event.keyCode == 27 /* Escape */ || event.keyCode == 13 /* Enter */) {
                this.deactivate();
                event.preventDefault();
            }
        }
    },

    _onItemMouseDown: {
        value: function(event) {
            event.stopPropagation();
            event.preventDefault();
        }
    },

    _onItemClick: {
        value: function(event) {
            if (event.target == this._itemsContainer) return;
            var item = event.target;
            while (item.parentElement != this._itemsContainer) {
                item = item.parentElement;
            }
            this.selectedItem = item;
            this.activate();
            event.stopPropagation();
            event.preventDefault();
        }
    },

    _escapeHTML: {
        value: function(x) {
            var entityMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            };

            return String(x).replace(/[&<>"\/]/g, function(s) {
              return entityMap[s];
            });
        }
    }
});