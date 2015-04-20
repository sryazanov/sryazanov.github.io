importScripts('../lib/papaparse.min.js');

onmessage = function(e) {
    var file = e.data;
    Papa.parse(file, {
        complete: sendContents
    })
}

var reader = new FileReader();

function sendContents(results) {
    console.log(results);

    var spots = [];
    for (var i = 1; i < results.data.length; i++) {
        var row = results.data[i];
        var name = row[0];
        if (name && row.length >= 5) {
            spots.push({
                x: Number(row[1]),
                y: Number(row[2]),
                z: Number(row[3]),
                r: Number(row[4]),
                index: spots.lenght
            });
        }
    }

    postMessage({
        status: 'success',
        data: spots,
    });
}