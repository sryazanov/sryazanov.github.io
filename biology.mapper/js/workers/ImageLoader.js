onmessage = function(e) {
    var file = e.data;
    var reader = new FileReader();
    reader.addEventListener('load', function(event) {
        // TODO: handle errors.
        postMessage({
            status: 'completed',
            blob: new Blob([event.target.result], {type: 'image/jpeg'}),
        });
    });
    reader.readAsArrayBuffer(e.data);
};