onmessage = function(e) {
    console.log("Mapping");
    var startTime = new Date();

    var verteces = e.data.verteces;
    var spots = new SpotCollection(e.data.spots);
    var colors = new Float32Array(verteces.length);
    var highlightedVerteces = 0;

    for (var i = 0; i < verteces.length; i += 3) {
        var x = verteces[i + 0];
        var y = verteces[i + 1];
        var z = verteces[i + 2];

        var index = spots.findClosest(x, y, z);
        if (index >= 0) {
            colors[i + 0] = 1;
            colors[i + 1] = 0;
            colors[i + 2] = 0;
            highlightedVerteces++;
        } else {
            colors[i + 0] = 0;
            colors[i + 1] = 1;
            colors[i + 2] = 0;
        }
    }

    var endTime = new Date();
    console.log('Processing time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
    console.log('Highlighted verteces: ' + highlightedVerteces);

    postMessage({
        status: 'success',
        colors: colors
    });
};

function SpotCollection(data) {
    this.data = data;
}

SpotCollection.prototype = {
    findClosest: function(x, y, z) {
        for (var i = 0; i < this.data.length; i++) {
            var spot = this.data[i];
            var dx = spot.X - x;
            var dy = spot.Y - y;
            var dz = spot.Z - z;
            var r = spot.Radii;
            var rsq = dx * dx + dy * dy + dz * dz;

            if (rsq < r * r) {
                return i;
            }
        }
        return -1;
    },
}