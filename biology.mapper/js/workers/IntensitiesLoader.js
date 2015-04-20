importScripts('../lib/papaparse.min.js');

onmessage = function(e) {
    var file = e.data;
    Papa.parse(file, {
        complete: sendContents
    })
};

function sendContents(results) {
    var measures = {};
    var names = [];

    var header = results.data[0];
    var spotNames = header.slice(1);

    for (var i = 1; i < results.data.length; i++) {
        var measure = results.data[i];
        if (measure.length < spotNames.length + 1) continue;
        var name = measure[0];
        names.push(name);
        var intensities = new Float32Array(spotNames.length);
        for (var j = 1; j <= spotNames.length; j++) {
            intensities[j - 1] = measure[j];
        }
        measures[name] = intensities;
    }

    postMessage({
        status: 'success',
        spots: spotNames,
        measures: measures,
        measureNames: names,
    });
}