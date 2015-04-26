var g_model;
var g_views = {};
var g_gui;
var g_mapSelector;

function init() {
    g_model = new Model();
    g_views.v3D = new View3D(g_model, $('#view-container canvas.view-3d')[0]);
    g_views.v2D = new View2D(g_model, $('#view-container svg.view-2d')[0]);
    g_views.vLegend = new ViewLegend(g_model, $('#view-container svg.view-legend')[0]);
    g_mapSelector = new MapSelector(g_model, $('#map-selector')[0], $('#current-map-name')[0]);

    initGUI();

    g_model.addEventListener('mode-change', onModelModeChange);
    g_model.addEventListener('status-change', onModelStatusChange);

    window.addEventListener('resize', updateLayout);
    document.addEventListener('keydown', onKeyDown, false);

    $('#open-button').click(onOpenButtonClick);
    $('#intensity-selection').change(onIntensitiesSelectChange);
    $('#current-map-label').click(g_mapSelector.activate.bind(g_mapSelector));

    for (var e in DragAndDrop) {
        document.addEventListener(e, DragAndDrop[e], true);
    }

    onModelModeChange();
}

function updateLayout() {
    for (name in g_views) {
        g_views[name].updateLayout();
    }
}

var KEYBOARD_SHORTCUTS = {
    "U+004F": onOpenButtonClick, // Ctrl + O
    "U+0046": function() { g_mapSelector.activate(); } // Ctrl + F
};

function onKeyDown(event) {
    if (event.ctrlKey && !event.altKey && event.keyIdentifier in KEYBOARD_SHORTCUTS) {
        var handler = KEYBOARD_SHORTCUTS[event.keyIdentifier];
        handler();
        event.stopPropagation();
        event.preventDefault();
    }
}

function onModelModeChange() {
    $('#view-container').attr('mode', g_model.mode);
    updateLayout();
}

function onModelStatusChange() {
    if (g_model.status) {
        $('#status').text(g_model.status);
        $('#status').prop('hidden', false);
    } else {
        $('#status').prop('hidden', true);
    }
}

function initGUI() {
    g_gui = new dat.GUI();
    var f3d = g_gui.addFolder('3D');
    f3d.addColor(g_model, 'color').name('Color');
    f3d.add(g_model, 'lightIntensity1', 0, 1).name('Light 1');
    f3d.add(g_model, 'lightIntensity2', 0, 1).name('Light 2');
    f3d.add(g_model, 'lightIntensity3', 0, 1).name('Light 3');

    var fMapping = g_gui.addFolder('Mapping');
    fMapping.add(g_model, 'scaleId', {'Linear': Model.Scale.LINEAR.id, 'Logarithmic': Model.Scale.LOG.id}).name('Scale');
    fMapping.add(g_model, 'hotspotQuantile').name('Hotspot quantile').step(0.0001);
    fMapping.add(g_model, 'spotBorder', 0, 1).name('Spot border').step(0.01);

    var fLegent = g_gui.addFolder('Legend');
    fLegent.add(g_views.vLegend, 'location', {
        'None': ViewLegend.Locations.NONE,
        'Left-top': ViewLegend.Locations.LEFT_TOP,
        'Right-top': ViewLegend.Locations.RIGHT_TOP,
        'Left-bottom': ViewLegend.Locations.LEFT_BOTTOM,
        'Right-bottom': ViewLegend.Locations.RIGHT_BOTTOM,
    }).name('Location');
}

var DragAndDrop = {
    _counter: 0,

    dragenter: function(e) {
        e.preventDefault();
        if (++DragAndDrop._counter == 1)
            $('body').attr('drop-target', '');
    },

    dragleave: function(e) {
        e.preventDefault();
        if (--DragAndDrop._counter === 0)
            $('body').removeAttr('drop-target');
    },

    dragover: function(e) {
        e.preventDefault();
    },

    drop: function(e) {
        DragAndDrop._counter = 0;
        $('body').removeAttr('drop-target');

        e.preventDefault();
        e.stopPropagation();

        openFiles(e.dataTransfer.files);
    }
};

function openFiles(files) {
    var handlers = findFileHandlers(files);
    for (var i = 0; i < handlers.length; i++) {
        handlers[i]();
    }
};

function findFileHandlers(files) {
    var result = [];
    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        if ((/\.png$/i.test(file.name))) {
            result.push(g_model.loadImage.bind(g_model, file));
        } else if (/\.stl$/i.test(file.name)) {
            result.push(g_model.loadMesh.bind(g_model, file));
        } else if (/\.csv$/i.test(file.name)) {
            result.push(g_model.loadIntensities.bind(g_model, file));
        }
    }
    return result;
}

function onOpenButtonClick() {
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.addEventListener('change', function() {
        openFiles(fileInput.files);
    });
    fileInput.click();
}

function onIntensitiesSelectChange() {
    var name = $('#intensity-selection').val();
    g_model.selectMeasure(name);
}

$(init);