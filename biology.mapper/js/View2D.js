'use strict';

function View2D(model, svg) {
    this._svg = svg;
    this._graphics = null;
    this._width = 0;
    this._height = 0;
    this._scale = 1.0;
    this._mouseAction = null;
    this._offset = {x: 0, y: 0};

    // Binding with model.
    this._model = model;
    this._model.addEventListener('2d-scene-change', this._onModelSceneChange.bind(this));
    this._model.addEventListener('2d-scene-needs-recoloring', this._onModelSceneNeedsRecoloring.bind(this));

    this._svg.addEventListener('mousewheel', this._onMouseWheel.bind(this));
    this._svg.addEventListener('mousedown', this._onMouseDown.bind(this));
}

View2D.SCALE_CHANGE = 1.2;

View2D.prototype = {
    updateLayout: function() {
        this._width = this._svg.clientWidth;
        this._height = this._svg.clientHeight;
        if (this._graphics)
            this.setOffset(this._offset);
    },

    getOffset: function() {
        return {x: this._offset.x, y: this._offset.y};
    },

    setOffset: function(offset) {
        this._offset.x = offset.x;
        this._offset.y = offset.y;

        var imageSize = this._model.imageSize;
        if (this._width > imageSize.width * this._scale) {
            this._offset.x = 0;
        } else {
            var max = Math.ceil((imageSize.width * this._scale - this._width) * 0.5);
            this._offset.x = Math.max(-max, Math.min(max, this._offset.x));
        }
        if (this._height > imageSize.height * this._scale) {
            this._offset.y = 0;
        } else {
            var max = Math.ceil((imageSize.height * this._scale - this._height) * 0.5);
            this._offset.y = Math.max(-max, Math.min(max, this._offset.y));
        }

        this._reposition();
    },

    _onModelSceneChange: function() {
        if (this._graphics) {
            this._svg.removeChild(this._graphics);
        }
        var graphics = this._model.buildSVG(this._svg.ownerDocument);
        this._graphics = graphics;
        if (graphics) {
            this._reposition();
            this._svg.appendChild(graphics);
        }
    },

    _onModelSceneNeedsRecoloring: function() {
        if (this._graphics) {
            this._model.recolorSVG(this._graphics);
        }
    },

    _reposition: function() {
        var imageSize = this._model.imageSize;
        var x = (this._width - imageSize.width * this._scale) / 2 + this._offset.x;
        var y = (this._height - imageSize.height * this._scale) / 2 + this._offset.y;
        this._graphics.setAttribute('transform', 'translate(' + x + ', ' + y + ') scale(' + this._scale + ')');
    },

    _onMouseWheel: function(event) {
        event.preventDefault();
		event.stopPropagation();

		if (this._mouseAction) return;

		if (event.wheelDelta > 0) {
		    this._scale *= View2D.SCALE_CHANGE;
		    this.setOffset(this._offset);
		} else if (event.wheelDelta < 0) {
		    this._scale /= View2D.SCALE_CHANGE;
		    this.setOffset(this._offset);
		}
    },

    _onMouseDown: function(event) {
        event.preventDefault();
        new View2D.MoveMouseAction().start(this, event);
    },

    _startAction: function(state, event) {
        this._action = state;
    }
};

View2D.MouseActionBase = function() {
    this._view = null;
    this._startX = 0;
    this._startY = 0;
    this._onMouseMoveBound = this._onMouseMove.bind(this);
    this._onMouseUpBound = this._onMouseUp.bind(this);
};

View2D.MouseActionBase.prototype = {
    _onMouseMove: function(event) {
        var dx = event.clientX - this._startX;
        var dy = event.clientY - this._startY;
        this.onmove(dx, dy);
    },

    _onMouseUp: function(event) {
        this.stop();
    },

    start: function(view, event) {
        this._startX = event.clientX;
        this._startY = event.clientY;
        this._view = view;
        this._view._mouseAction = this;
        document.addEventListener('mousemove', this._onMouseMoveBound, false);
        document.addEventListener('mouseup', this._onMouseUpBound, false);

        this.init();
    },

    stop: function() {
        document.removeEventListener('mousemove', this._onMouseMoveBound, false);
        document.removeEventListener('mouseup', this._onMouseUpBound, false);
        this._view._mouseAction = null;
        this._view = null;
    },

    onmove: function(dx, dy) {},
    init: function() {},
};

View2D.MoveMouseAction = function() {
    View2D.MouseActionBase.call(this);
};

View2D.MoveMouseAction.prototype = {
    __proto__: View2D.MouseActionBase.prototype,

    init: function() {
        this._offset = this._view.getOffset();
    },

    onmove: function(dx, dy) {
        this._view.setOffset({x: this._offset.x + dx, y: this._offset.y + dy});
    },
};
