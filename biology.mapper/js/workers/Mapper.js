onmessage = function(e) {
    console.log("Mapping");
    var startTime = new Date();

    var positions = e.data.verteces;
    var spots = e.data.spots;

    var pointCount = (positions.length / 3) | 0;
    var closestSpotIndeces = new Int32Array(pointCount);
    var closestSpotDistances = new Float32Array(pointCount);
    var progress = -1;
    var nextChunk = 0;
    var highlightedVerteces = 0;

    for (var i = 0; i < pointCount; i++) {
        while (i >= nextChunk) {
            progress++;
            nextChunk = Math.ceil((progress + 1) * pointCount / 100);
            postMessage({
                status: 'progress',
                progress: progress
            })
        }
        var positionOffset = i * 3;
        var x = positions[positionOffset + 0];
        var y = positions[positionOffset + 1];
        var z = positions[positionOffset + 2];

        var closestSpotIndex = -1;
        var closesSpotSquareDistance = undefined;

        for (var j = 0; j < spots.length; j++) {
            var spot = spots[j];
            var dx = spot.X - x;
            var dy = spot.Y - y;
            var dz = spot.Z - z;
            var r = spot.Radii;
            var rsq = dx * dx + dy * dy + dz * dz;

            if (rsq > r * r) continue;

            if (closestSpotIndex > 0 || rsq < closesSpotSquareDistance) {
                closesSpotSquareDistance = rsq;
                closestSpotIndex = j;
            }
        }

        closestSpotIndeces[i] = closestSpotIndex;
        if (closestSpotIndex >= 0) {
            closestSpotDistances[i] = Math.sqrt(closesSpotSquareDistance) / spots[closestSpotIndex].Radii;
        } else {
            closestSpotDistances[i] = 1.0;
        }
    }

    var endTime = new Date();
    console.log('Processing time: ' + (endTime.valueOf() - startTime.valueOf()) / 1000);
    console.log('Highlighted verteces: ' + highlightedVerteces);

    postMessage({
        status: 'success',
        closestSpotIndeces: closestSpotIndeces,
        closestSpotDistances: closestSpotDistances,
        processingTime: endTime.valueOf() - startTime.valueOf()
    });
};