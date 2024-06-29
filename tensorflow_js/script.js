const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const disableButton = document.getElementById('disableButton');
const enableButton = document.getElementById('enableButton');
const slider = document.getElementById("threshold");
const sliderOutput = document.getElementById("slider-val");
var globalThreshold = slider.value;
var globalLogFile = "";
sliderOutput.innerHTML = globalThreshold;

slider.onchange = function() {
  globalThreshold = slider.value;
  sliderOutput.innerHTML = globalThreshold;
}

function logMessage(message) {
    globalLogFile += message + "\n"; 
}

var videoPaused = false;
// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia);
  }
  
  // If webcam supported, add event listener to button for when user
  // wants to activate it to call enableCam function which we will 
  // define in the next step.
  if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
    enableButton.addEventListener('click', resumeCam);
    disableButton.addEventListener('click', disableCam);
  } else {
    console.warn('getUserMedia() is not supported by your browser');
  }

function disableCam(event) {
  video.pause();
  videoPaused = true;
  enableButton.classList.remove("hidden");
  disableButton.classList.add("hidden");
  saveLogs();
}

function resumeCam(event) { 
  enableButton.classList.remove("hidden");
  disableButton.classList.remove("hidden");
  video.play(); 
  videoPaused = false;
  enableCam();
}

function generateUniqueID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveScreenshot(uid) {
  // Create canvas
  var canvas = document.createElement('canvas');
  canvas.width = 640; // video width
  canvas.height = 480; // video height

  // Get context
  var context = canvas.getContext('2d');

  // Draw image to canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convert image to base64 string
  var base64Image = canvas.toDataURL('image/png');
  //localStorage.setItem("imgData", base64Image);
  canvas.toBlob(function(blob) {
    saveAs(blob, `${uid}.png`);
  });
}

function saveLogs() {
  var blob = new Blob([globalLogFile], {type: "text/plain;charset=utf-8"});
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.download = "identification-logs.txt";
  link.href = url;
  link.click();
}
  
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
      return;
    }
    
    // Hide the button once clicked.
    event.target.classList.add('removed');
    disableButton.classList.remove('hidden');
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
      video: {
        width: {exact: 640},
        height: {exact: 480},
        frameRate: {
          ideal: 4,
          max: 4
        }
      }
    };
  
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
    });
  }

const model = new cvstfjs.ObjectDetectionModel();
loadModel();

async function loadModel() {
  try {
    await model.loadModelAsync('model.json');
        console.info('Model loaded successfully:', model);
        demosSection.classList.remove('invisible');
    } catch (error) {
        console.error('Error loading the model:', error);
  }
}

var children = [];

const plantList = `
Amaranthus_Palmeri
Conyza_Bonariensis
Digitaria_Insularis
Eleusine_Indica
Lolium_Multiflorum
`;

// Convert the list to an array
const labels = Array.from(plantList.trim().split('\n'));


function buildDetectedObjects(detected_scores, threshold, imageWidth, imageHeight, detected_boxes, detected_classes) {
    const detectionObjects = [];
    detected_scores.forEach((score, i) => {
      if (score >= threshold) {
        const bbox = [];
        bbox[1] = detected_boxes[i][1] * imageHeight;
        bbox[0] = detected_boxes[i][0] * imageWidth;;
        bbox[3] = detected_boxes[i][3] * imageHeight;
        bbox[2] = detected_boxes[i][2] * imageWidth;
        console.log(bbox);
        detectionObjects.push({
          class: detected_classes[i],
          score: score.toFixed(4),
          bbox: bbox
        })
      }
    })

    return detectionObjects;
  }

async function predictWebcam() {
    
    // Now let's start classifying a frame in the stream.
    const result = await model.executeAsync(video);
    const h = video.videoHeight;
    const w = video.videoWidth;
    
    let detected_boxes, detected_scores, detected_classes;
	[detected_boxes, detected_scores, detected_classes] = result;

    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }

    children.splice(0);
    
    var detected_objects = buildDetectedObjects(detected_scores, globalThreshold, w, h, detected_boxes, detected_classes);

    // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
    for (let n = 0; n < detected_objects.length; n++) {

        const p = document.createElement('p');
        var labelClass = labels[detected_objects[n].class];
        p.innerText =  labelClass  + ' - with ' 
            + Math.round(parseFloat(detected_objects[n].score) * 100) 
            + '% confidence.';
        p.style = 'margin-left: ' + detected_objects[n].bbox[0] + 'px; margin-top: '
            + (detected_objects[n].bbox[1] - 10) + 'px; width: ' 
            + (detected_objects[n].bbox[2] - 10) + 'px; top: 0; left: 0;';

        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.style = 'left: ' + detected_objects[n].bbox[0] + 'px; top: '
            + detected_objects[n].bbox[1] + 'px; width: ' 
            + detected_objects[n].bbox[2] + 'px; height: '
            + detected_objects[n].bbox[3] + 'px;';

        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        var uid = generateUniqueID();
        logMessage(`${labelClass} | ${uid} | Last bbox: ${detected_objects[n].bbox[0]}, ${detected_objects[n].bbox[1]}, ${detected_objects[n].bbox[2]}, ${detected_objects[n].bbox[3]}`);
        saveScreenshot(uid);
        children.push(highlighter);
        children.push(p);
      }
     // Call this function again to keep predicting when the browser is ready.
    if(!videoPaused) 
      window.requestAnimationFrame(predictWebcam);
}