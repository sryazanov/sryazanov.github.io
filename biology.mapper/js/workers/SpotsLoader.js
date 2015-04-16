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
    postMessage({
        status: 'success',
        data: results.data,
    });
}