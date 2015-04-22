var g_model;
var g_view;

function init() {
    g_model = new Model();
    g_view = new View3D(g_model, $('canvas')[0]);

    g_model.addEventListener('status-change', onModelStatusChange);
    g_model.addEventListener('intensities-change', onModelIntencitiesChange);

    window.addEventListener('resize', onResize);

    $('#load-mesh-button').click(onLoadMeshButtonClick);
    $('#load-intensities-button').click(onLoadIntensitiesButtonClick);
    $('#intensity-selection').change(onIntensitiesSelectChange);

    for (var e in DragAndDrop) {
        document.addEventListener(e, DragAndDrop[e], true);
    }

    onResize();
}

function onResize() {
    var container = $('.canvas-container')[0];
    var width = container.offsetWidth;
    var height = container.offsetHeight;

    if (g_view) g_view.resize(width, height);
}

function onModelIntencitiesChange() {
    var options = $('#intensity-selection');
    options.empty();
    $.each(g_model.getMeasures(), function() {
        options.append($("<option />").val(this.index).text(this.name));
    });
    g_model.selectMeasure(options.val());
}

var DragAndDrop = {
    _counter: 0,

    dragenter: function(e) {
        e.preventDefault();
        if (++DragAndDrop._counter == 1)
            $('#drop-target-informer').prop('hidden', false);
        console.log(DragAndDrop._counter);
    },

    dragleave: function(e) {
        e.preventDefault();
        if (--DragAndDrop._counter === 0)
            $('#drop-target-informer').prop('hidden', true);
        console.log(DragAndDrop._counter);
    },

    dragover: function(e) {
        e.preventDefault();
    },

    drop: function(e) {
        DragAndDrop._counter = 0;
        $('#drop-target-informer').prop('hidden', true);

        e.preventDefault();
        e.stopPropagation();
        for (var i = 0; i < e.dataTransfer.files.length; i++) {
            var file = e.dataTransfer.files[i];

            if (/\.stl$/i.test(file.name)) {
                g_model.loadMesh(file);
            } else if (/\.csv$/i.test(file.name)) {
                g_model.loadIntensities(file);
            }
        }
    }
};

function openFile() {
    return new Promise(function(resolve) {
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.addEventListener('change', function() {
            resolve(fileInput.files[0]);
        });
        fileInput.click();
    });
}

function onModelStatusChange() {
    $('#status').text(g_model.getStatus());
}

function onLoadMeshButtonClick() {
    openFile().then(g_model.loadMesh.bind(g_model));
}

function onLoadIntensitiesButtonClick() {
    openFile().then(g_model.loadIntensities.bind(g_model));
}

function onIntensitiesSelectChange() {
    var name = $('#intensity-selection').val();
    g_model.selectMeasure(name);
}

$(init);