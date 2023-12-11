DEBUG = true;

var runtime = null; // Obiekt do manipulacji sceną podczas działania
var root = null; // Referencja do obiektu matrixTransform

var initDone = false; // Flaga, czy inicjalizacja śledzenia została wykonana
var doTracking = true; // Czy śledzić czy nie

var width = 320; // Szerokość canvas/wideo
var height = 240; // Wysokość
var canvas = null; // Globalny obiekt canvas do renderowania
var videoCanvas = null; // To samo dla wideo

var detector = null; // Obiekt detektora markerów
var raster = null; // Raster do odczytu danych obrazu

var resultMat = null; // Macierz przekazywana z JSARToolKit do sceny X3D
var threshold = 100; // Próg światła

var videoStream = null; // Strumień wideo
var video = document.createElement('video'); // Tworzenie elementu wideo

// Normalizacja różnych wersji getUserMedia
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia);

var getUserMedia = function(t, onsuccess, onerror) { // Pobieranie getUserMedia
    if (navigator.getUserMedia) {
        return navigator.getUserMedia(t, onsuccess, onerror);
    } else {
        onerror(new Error("No getUserMedia implementation found."));
        return null;
    }
};

function startCam() {
    getUserMedia(
        { video: true, audio: false },
        function (stream) {
            console.log(stream);
            video.crossOrigin = ""; // Pozwól na komunikację cross-domain
            video.srcObject = stream; // Ustaw strumień jako źródło wideo
            videoStream = stream; // Zapisz do zmiennej

            // Włącz animację podczas śledzenia
            document.getElementById("TS_planet").setAttribute("enabled", "true");
        },
        function (error) {
            alert("Could not access webcam."); // Jeśli nie uda się uzyskać dostępu do kamery, wyświetl błąd
        });
}

startCam(); // Wywołaj funkcję startCam

var a = true;

document.onload = function () { // Wywołuje się, gdy strona jest w pełni załadowana
    runtime = document.getElementById("x3d").runtime; // Pozwala manipulować kontekstem x3dom podczas działania

    root = document.getElementById("root"); // Pobierz node MatrixTransform

    runtime.exitFrame = function () {
        if (!initDone) {
            initializeTracker();
            initDone = true;
        }

        if (doTracking) {
            animate();

            this.triggerRedraw(); // Wywołuje funkcję przerysowującą

            if (a) {
                console.log(this);
                a = false;
            }
        }
    };
};

function redraw() // Przerysuj
{
    videoCanvas.getContext('2d').drawImage(video, 0, 0);
    canvas.getContext('2d').drawImage(videoCanvas, 0, 0, width, height);
    // Informuj JSARToolKit, że canvas został zmieniony.
    canvas.changed = true;
}

function animate() {
    // Narysuj klatkę wideo na canvasie.
    try {
        redraw();
    }
    catch (e) {
        // Workaround dla Firefoksa
        if (e.name == "NS_ERROR_NOT_AVAILABLE") {
            setTimeout(function () { redraw(); }, 10);
        }
        else { throw e; }
    }
    // Wykrywaj markery na klatce wideo.
    var markerCount = detector.detectMarkerLite(raster, threshold);

    for (var i = 0; i < markerCount; i++) {
        // Pobierz macierz markera do macierzy wynikowej.
        detector.getTransformMatrix(i, resultMat);

        // Skopiuj macierz markera do macierzy tymczasowej.
        var tmpMat = adaptMarkerMatrix(resultMat);

        // Skopiuj macierz markera do obiektu macierzy markera.
        root.setAttribute("matrix", tmpMat.toGL().toString());
    }
}

function adaptMarkerMatrix(arMat) {
    var tmpMat = new x3dom.fields.SFMatrix4f(
        arMat.m00, arMat.m01, arMat.m02, arMat.m03,
        arMat.m10, arMat.m11, arMat.m12, arMat.m13,
        arMat.m20, arMat.m21, arMat.m22, arMat.m23,
        0, 0, 0, 1);

    var translation = new x3dom.fields.SFVec3f(0, 0, 0),
        scale = new x3dom.fields.SFVec3f(1, 1, 1);
    var rotation = new x3dom.fields.Quaternion(0, 0, 1, 0),
        scaleOrient = new x3dom.fields.Quaternion(0, 0, 1, 0);

    tmpMat.getTransform(translation, rotation, scale, scaleOrient);

    // Obraz kamery jest odwrócony, dlatego odwróć orientację.
    rotation.y *= -1;
    rotation.z *= -1;
    translation.y *= -1;
    translation.z *= -1;

    tmpMat = rotation.toMatrix();
    tmpMat.setTranslate(translation);

    return tmpMat;
}

function initializeTracker() {
    // Ustaw JSARToolKit
    canvas = document.createElement('canvas');
    canvas.id = "trackerCanvas";
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    if (DEBUG) { // Pokaż okno debugowania
        var debugCanvas = document.createElement('canvas');
        debugCanvas.id = 'debugCanvas';
        debugCanvas.width = width;
        debugCanvas.height = height;
        document.body.appendChild(debugCanvas);
    }

    // Stwórz obiekt rastera RGB dla 2D canvas.
    raster = new NyARRgbRaster_Canvas2D(canvas);

    // FLARParam ustawia parametry kamery dla FLARToolKit.
    // Tworzymy parametr dla obrazów o wymiarach 320x240 pikseli.
    var param = new FLARParam(width, height);

    // FLARMultiIdMarkerDetector to silnik detekcji markerów.
    // Wykrywa wiele markerów ID. Markery ID to specjalne markery kodujące numer.
    detector = new FLARMultiIdMarkerDetector(param, 120);

    // Ustaw tryb ciągły na true dla śledzenia wideo.
    detector.setContinueMode(true);

    // Skopiuj macierz perspektywy kamery z FLARParam do macierzy kamery WebGL.
    // Drugi i trzeci parametr określają płaszczyzny zNear i zFar dla macierzy perspektywy.
    var camera = document.getElementById("vf");

    var zNear = camera.getNear();
    var zFar = camera.getFar();
    var perspectiveMatrix = runtime.projectionMatrix().toGL();

    param.copyCameraMatrix(perspectiveMatrix, zNear, zFar);

    var proj = new x3dom.fields.SFMatrix4f();
    proj.setFromArray(perspectiveMatrix);
    proj._22 *= -1;
    proj._32 *= -1;

    camera.setAttribute("projection", proj.toGL().toString());

    // Wykrywanie markerów
    videoCanvas = document.getElementById('bgnd');

    // Utwórz obiekt NyARTransMatResult do uzyskiwania macierzy translacji markera.
    resultMat = new NyARTransMatResult();

    // Narysuj klatkę wideo na canvasie rasterowym, przeskalowaną do 320x240.
    // I poinformuj obiekt rastera, że zmienił się podstawowy canvas.
    redraw();
}

function showMarker() {
    var win = window.open('./marker.png', 'Marker', 'width=420,height=420');
    win.focus();
}
