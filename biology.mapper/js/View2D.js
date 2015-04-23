'use strict';

function View2D(model, svg) {
    this._svg = svg;
    this._graphics = null;

    // Binding with model.
    this._model = model;
    this._model.addEventListener('graphics-change', this._onModelGraphicsChange.bind(this));
    this._model.addEventListener('color-change', this._onModelColorChange.bind(this));

    this._onModelGraphicsChange();
}

View2D.prototype = {
    resize: function(width, height) {
        this._svg.style.width = width + 'px';
        this._svg.style.height = height + 'px';
    },

    _onModelGraphicsChange: function() {
        if (this._graphics) {
            this._svg.removeChild(this._graphics);
        }
        var graphics = this._model.buildSVG(this._svg.ownerDocument);
        if (graphics) this._svg.appendChild(graphics);
        this._graphics = graphics;
        this._svg.style.display = graphics ? '' : 'none';
    },

    _onModelColorChange: function() {
        if (this._graphics) {
            this._model.recolorSVG(this._graphics);
        }
    },
};