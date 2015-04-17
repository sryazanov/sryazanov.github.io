importScripts('../lib/papaparse.min.js');

onmessage = function(e) {
    var file = e.data;
    Papa.parse(file, {
        complete: sendContents,
        header: true
    })
}

var reader = new FileReader();

function sendContents(results) {
    console.log(results);

    var spots = results.data;
    for (var i = 0; i < spots.length; i++) {
        var spot = spots[i];
        spot.X = Number(spot.X);
        spot.Y = Number(spot.Y);
        spot.Z = Number(spot.Z);
        spot.Radii = Number(spot.Radii);
    }

    postMessage({
        status: 'success',
        data: spots,
    });
}