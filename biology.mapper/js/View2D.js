'use strict';

function View2D(model, svg) {
    this._svg = svg;
    this._graphics = null;
    this._width = 0;
    this._height = 0;
    this._scale = 1.0;

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
        this._width = width;
        this._height = height;
        if (this._graphics)
            this._reposition();
    },

    _onModelGraphicsChange: function() {
        if (this._graphics) {
            this._svg.removeChild(this._graphics);
        }
        var graphics = this._model.buildSVG(this._svg.ownerDocument);
        this._graphics = graphics;
        if (graphics) {
            this._reposition();
            this._svg.appendChild(graphics);
        }
        this._svg.style.display = graphics ? '' : 'none';
    },

    _reposition: function() {
        var imageSize = this._model.getImageSize();
        var x = (this._width - imageSize.width * this._scale) / 2;
        var y = (this._height - imageSize.height * this._scale) / 2;
        this._graphics.setAttribute('transform', 'translate(' + x + ', ' + y + ') scale(' + this._scale + ')');
    },

    _onModelColorChange: function() {
        if (this._graphics) {
            this._model.recolorSVG(this._graphics);
        }
    },
};