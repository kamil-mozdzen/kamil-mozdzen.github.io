(function () {
    if (
      !"mediaDevices" in navigator ||
      !"getUserMedia" in navigator.mediaDevices
    ) {
      alert("Camera API is not available in your browser");
      return;
    }

    var totalNumberModels = 7;

  
    // get page elements
    const video = document.querySelector("#video");
    const btnPlay = document.querySelector("#btnPlay");
    const btnPause = document.querySelector("#btnPause");
    const btnScreenshot = document.querySelector("#btnScreenshot");
    const btnChangeCamera = document.querySelector("#btnChangeCamera");
    const screenshotsContainer = document.querySelector("#screenshots");
    const canvas = document.querySelector("#canvas");
    const devicesSelect = document.querySelector("#devicesSelect");
  
    // video constraints
    const constraints = {
      video: {
        width: {
          min: 1280,
          ideal: 1920,
          max: 2560,
        },
        height: {
          min: 720,
          ideal: 1080,
          max: 1440,
        },
      },
    };
  
    // use front face camera
    let useFrontCamera = true;
  
    // current video stream
    let videoStream;
  
    // handle events
    // play
    btnPlay.addEventListener("click", function () {
      video.play();
      btnPlay.classList.add("is-hidden");
      btnPause.classList.remove("is-hidden");
    });
  
    // pause
    btnPause.addEventListener("click", function () {
      video.pause();
      btnPause.classList.add("is-hidden");
      btnPlay.classList.remove("is-hidden");
    });
  
    // take screenshot
    btnScreenshot.addEventListener("click", function () {
      const img = document.createElement("img");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      img.src = canvas.toDataURL("image/png");
      screenshotsContainer.prepend(img);
    });
  
    // switch camera
    btnChangeCamera.addEventListener("click", function () {
      useFrontCamera = !useFrontCamera;
  
      initializeCamera();
    });
  
    // stop video stream
    function stopVideoStream() {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    }
  
    // initialize
    async function initializeCamera() {
      stopVideoStream();
      constraints.video.facingMode = useFrontCamera ? "user" : "environment";
  
      try {
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = videoStream;
      } catch (err) {
        alert("Could not access the camera");
      }
    }
  
    initializeCamera();
  })();
  document.onload = function() 
{
    runtime = document.getElementById("x3d").runtime; //allows to manipulate the x3dom context during the runtime

    //root = document.getElementById("root"); //get the MatrixTransform node

    runtime.exitFrame = function () {
        if (!initDone) {
            initializeTracker();
            initDone = true;
        }

        if (doTracking) {
            animate();

            this.triggerRedraw(); //triggers redraw function

            if(a){
                console.log(this);
                a= false;
            }

        }
    };
};

// Function to redraw the canvas
function redraw()  //redraw
{
    videoCanvas.getContext('2d').drawImage(video, 0, 0, 1300, 2000);
    canvas.getContext('2d').drawImage(videoCanvas, 0, 0, width, height);
    // Tell JSARToolKit that the canvas has changed.
    canvas.changed = true;
}

// Function to animate responsible for drawing the video frame to the canvas, detecting markers in the video frame, and updating the position and orientation of the 3D models based on the detected markers.
function animate()
{
    // Draw the video frame to the canvas.
    try {
        redraw();
    }
    catch (e) {
        // workaround for Firefox
        if (e.name == "NS_ERROR_NOT_AVAILABLE") {
            setTimeout(function() { redraw(); }, 10);
        }
        else { throw e; }
    }
    // Use the detector object to find markers in the raster object (the canvas), using the given threshold.
    var markerCount = detector.detectMarkerLite(raster, threshold);
    var nMarkerArray = []; // Array to store nMarker values

    //If there are no markers all the 3D models will be hided
    if(!markerCount){
        document.getElementById("switcher").setAttribute("whichChoice", -1);
        document.getElementById("switcher0").setAttribute("whichChoice", -1);
        document.getElementById("switcher1").setAttribute("whichChoice", -1);
        document.getElementById("switcher2").setAttribute("whichChoice", -1);
        document.getElementById("switcher3").setAttribute("whichChoice", -1);
        document.getElementById("switcher4").setAttribute("whichChoice", -1);
        document.getElementById("switcher5").setAttribute("whichChoice", -1);
        document.getElementById("switcher6").setAttribute("whichChoice", -1);
    }

    // For each detected marker...
    for (var i=0; i<markerCount; i++) {

        console.log("MARKER");
        
        //Obtaining the marker number 
        var numberMarker = detector.getIdMarkerData(i);
        var nMarker = numberMarker._packet[1];
        nMarkerArray.push(nMarker); // Store nMarker in the array
        
        // Depending on the ID of the marker, get the corresponding 3D model.
        switch(nMarker) {
            case 0:
                root = document.getElementById("root0"); //get the MatrixTransform node
              break;
            case 1:
                root = document.getElementById("root1"); //get the MatrixTransform node
              break;
            case 2:
                root = document.getElementById("root2"); //get the MatrixTransform node
              break;
            case 3:
                root = document.getElementById("root3"); //get the MatrixTransform node
            break;
            case 4:
                root = document.getElementById("root4"); //get the MatrixTransform node
              break;
            case 5:
                root = document.getElementById("root5"); //get the MatrixTransform node
            break;
            case 6:
                root = document.getElementById("root6"); //get the MatrixTransform node
            break;            
            default:
              root = document.getElementById("root");
          }

        // Get the marker matrix into the result matrix.
        detector.getTransformMatrix(i, resultMat);
        
        // Copy the marker matrix to the tmp matrix.
        var tmpMat = adaptMarkerMatrix(resultMat);
        console.error(tmpMat);
        // Copy the marker matrix over to your marker root object.
        root.setAttribute("matrix", tmpMat.toGL().toString());


        
    }

        if(nMarkerArray.length > 0) {
        //Iterate over the nMarkerArray
        for(var i = 0; i < totalNumberModels; i++){
          
          if(nMarkerArray.includes(i)) {
            var currentNMarker = nMarkerArray[i];
            // Execute your code here
            document.getElementById("switcher"+i+"").setAttribute("whichChoice", 0);
            console.log('Number ' + i + ' found in array at position: ' + currentNMarker);
        } else {
            document.getElementById("switcher"+i+"").setAttribute("whichChoice", -1);
        }
        }
        }
}

// Function to adapt the marker matrix
function adaptMarkerMatrix(arMat)
{
    var tmpMat = new x3dom.fields.SFMatrix4f(
        arMat.m00,  arMat.m01,  arMat.m02,  arMat.m03,
        arMat.m10,  arMat.m11,  arMat.m12,  arMat.m13,
        arMat.m20,  arMat.m21,  arMat.m22,  arMat.m23,
        0,          0,          0,          1);

    var translation = new x3dom.fields.SFVec3f(0,0,0),
        scale = new x3dom.fields.SFVec3f(1,1,1);
    var rotation = new x3dom.fields.Quaternion(0,0,1,0),
        scaleOrient = new x3dom.fields.Quaternion(0,0,1,0);

    tmpMat.getTransform(translation, rotation, scale, scaleOrient);

    // camera image is flipped, therefore flip orientation, too
    rotation.y *= -1;
    rotation.z *= -1;
    translation.y *= -1;
    translation.z *= -1;

    tmpMat = rotation.toMatrix();
    tmpMat.setTranslate(translation);

    return tmpMat;
}

// Function to initialize the tracker
function initializeTracker()
{
    // Setting up JSARToolKit
    canvas = document.createElement('canvas');
    canvas.id = "trackerCanvas";
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    if (DEBUG) { //shows the debug window
        var debugCanvas = document.createElement('canvas');
        debugCanvas.id = 'debugCanvas';
        debugCanvas.width = width;
        debugCanvas.height = height;
        document.body.appendChild(debugCanvas);
    }

    // Create an RGB raster object for the 2D canvas.
    // JSARToolKit uses raster objects to read image data.
    // Note that you need to set canvas.changed = true on every frame.
    raster = new NyARRgbRaster_Canvas2D(canvas);

    // FLARParam is the thing used by FLARToolKit to set camera parameters.
    // Here we create a FLARParam for images with 320x240 pixel dimensions.
    var param = new FLARParam(width, height);

    // The FLARMultiIdMarkerDetector is the actual detection engine for marker detection.
    // It detects multiple ID markers. ID markers are special markers that encode a number.
    detector = new FLARMultiIdMarkerDetector(param, 120);

    // For tracking video set continue mode to true. In continue mode, the detector
    // tracks markers across multiple frames.
    detector.setContinueMode(true);

    // Copy the camera perspective matrix from the FLARParam to the WebGL library camera matrix.
    // The second and third parameters determine the zNear and zFar planes for the perspective matrix.
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

    // Detecting markers
    videoCanvas = document.getElementById('bgnd');

    // Create a NyARTransMatResult object for getting the marker translation matrices.
    resultMat = new NyARTransMatResult();

    // Draw the video frame to the raster canvas, scaled to 320x240.
    // And tell the raster object that the underlying canvas has changed.
    redraw();
}

// Function to show the marker
function showMarker()
{
    var win = window.open('./marker.png','Marker','width=420,height=420');
    win.focus();
}
