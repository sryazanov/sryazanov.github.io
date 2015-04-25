'use strict';

function ViewLegend(model, svg) {
    this._model = model;
    this._svg = svg;
    this.updateColorMap();
}

ViewLegend.Locations = {
    NONE: 'none',
    LEFT_TOP: 'left-top',
    RIGHT_TOP: 'right-top',
    LEFT_BOTTOM: 'left-bottom',
    RIGHT_BOTTOM: 'right-bottom'
};

ViewLegend.prototype = Object.create(null, {
    resize: {
        value: function(width, height) {

        }
    },

    location: {
        get: function() {
            return this._svg.getAttribute('location');
        },
        set: function(value) {
            for (var i in ViewLegend.Locations) {
                if (ViewLegend.Locations[i] == value) {
                    this._svg.setAttribute('location', value);
                    return;
                }
            }
            throw 'Invalid location: ' + value;
        }
    },

    updateColorMap: {
        value: function() {
            var description = this._model.colorMapGradient;
            var stops = [];
            for (var i in description) {
                stops.push('<stop offset="' + i + '" style="stop-color:' + description[i] + '" />');
            }
            this._svg.getElementById('colorMapGradient').innerHTML = stops.join('');
        }
    }
});