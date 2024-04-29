const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');

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
  } else {
    console.warn('getUserMedia() is not supported by your browser');
  }
  
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
      return;
    }
    
    // Hide the button once clicked.
    event.target.classList.add('removed');  
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
      video: true
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
    
    var detected_objects = buildDetectedObjects(detected_scores, 0.6, w, h, detected_boxes, detected_classes);

    // Now lets loop through predictions and draw them to the live view if
    // they have a high confidence score.
    for (let n = 0; n < detected_objects.length; n++) {

        const p = document.createElement('p');
        p.innerText =  labels[detected_objects[n].class]  + ' - with ' 
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
        children.push(highlighter);
        children.push(p);
      }
     // Call this function again to keep predicting when the browser is ready.
     window.requestAnimationFrame(predictWebcam);
}