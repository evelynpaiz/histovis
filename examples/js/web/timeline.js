// Ref: https://codepen.io/MinzCode/pen/MWKgyqb
// Ref: https://codepen.io/simeydotme/pen/mJLPPq
/* ---------------------- Variables ---------------------- */
var startDate = -1; 
var endDate = 1;

var leftValue = 0;
var rightValue = 0;

var maxStep = 10;

/* ----------------------- Functions --------------------- */
function checkTimeline() {
    // Checks if it has a parent document
    if(window.location !== window.parent.location && Object.values(dates).length > 0) {
        const min =  Math.min.apply(Math, Object.values(dates)) - 1;
        const max = Math.max.apply(Math, Object.values(dates)) + 1;

        if(min > 1000 && max > 1000 && (min != startDate || max != endDate)) {
            startDate = min;
            endDate = max;
            createTimeline();
        } 
    }
}

function createTimeline() {
    // Change range value of the sliders
    var inputLeft = parent.document.getElementById("input-left");
    var inputRight = parent.document.getElementById("input-right");

    var thumbLeft = parent.document.querySelector(".slider > .thumb.left");
    var thumbRight = parent.document.querySelector(".slider > .thumb.right");
    var range = parent.document.querySelector(".slider > .range");

    inputLeft.min = startDate; inputRight.min = startDate;
    inputLeft.max = endDate; inputRight.max = endDate;

    // Move the selector if it is out of range
    leftValue = 1 + startDate;
    rightValue = -1 + endDate;
    setLeftValue();
    setRightValue();

    range.style.display = 'block'; 
    thumbLeft.style.display = 'block'; 
    thumbRight.style.display = 'block'; 

    // Clean the existing labels
    var labels = parent.document.getElementById("labelTimeline");
    labels.innerHTML = '';
    // Set the new labels
    var step = endDate - startDate;

    var diff = 1;
    if(step > maxStep) {
        diff = Math.ceil(step / maxStep);
        step = maxStep;
    }
    for (var i = 0; i <= step; i++) {
        var l = parent.document.createElement('label');
        l.textContent = startDate + i*diff;
        l.setAttribute('style', `left: ${i / step * 100}%;`);
        labels.append(l);
    }

    // Add the graphical representation of the number of images 
    var images = parent.document.getElementById("imagesTimeline");
    images.innerHTML = '';

    step = endDate - startDate;
    var percent = 100. / (step + 1);

    var count = {};
    Object.values(dates).forEach(function(i) { count[i] = (count[i]||0) + 1;});

    const max = Math.max.apply(Math, Object.values(count));
    for (var i = 0; i <= step; i++) {
        var c = count[startDate + i];
        if(c) {
            var div = parent.document.createElement('div');
            div.setAttribute('style', `left: calc(${i / step * 100}% - ${(c * percent) / (2 * max)}%); width: ${(c * percent) / max}%;`);
            images.append(div);
        }
    }
}

function setLeftValue() {
    var inputLeft = parent.document.getElementById("input-left");
    var inputRight = parent.document.getElementById("input-right");

    inputLeft.style.zIndex = 3;
    inputRight.style.zIndex = 2;

    var thumbLeft = parent.document.querySelector(".slider > .thumb.left");
    var range = parent.document.querySelector(".slider > .range");

    updateViewedCameras();

    var _this = inputLeft,
		min = parseInt(_this.min),
		max = parseInt(_this.max);
    
    _this.value = Math.min(leftValue, rightValue);

    var percent = ((_this.value - min) / (max - min)) * 100;

    thumbLeft.style.left = percent + "%";
    range.style.left = percent + "%";
}

function setRightValue() {
    var inputLeft = parent.document.getElementById("input-left");
    var inputRight = parent.document.getElementById("input-right");

    inputLeft.style.zIndex = 2;
    inputRight.style.zIndex = 3;

    var thumbRight = parent.document.querySelector(".slider > .thumb.right");
    var range = parent.document.querySelector(".slider > .range");

    updateViewedCameras();

	var _this = inputRight,
		min = parseInt(_this.min),
		max = parseInt(_this.max);

	_this.value = Math.max(rightValue, leftValue);

    var percent = ((_this.value - min) / (max - min)) * 100;

	thumbRight.style.right = (100 - percent) + "%";
	range.style.right = (100 - percent) + "%";
}

function updateViewedCameras() {
    names = Object.entries(dates).sort().filter(([name, year]) => year >= leftValue && year <= rightValue)
        .map(([name, year]) => {return name;});

    cameras.children.forEach( cam => {
        var helper = cam.children[0];
        if(!names.includes(cam.name)) {
            helper.visible = false;
            multipleTextureMaterial.removeCamera(cam);
        } else {
            helper.visible = true;
            if(helper.userData.selected == true) multipleTextureMaterial.setCamera(cam);
        }
    });
}

if(window.location !== window.parent.location) {
    var inputLeft = parent.document.getElementById("input-left");
    var inputRight = parent.document.getElementById("input-right");

    var thumbLeft = parent.document.querySelector(".slider > .thumb.left");
    var thumbRight = parent.document.querySelector(".slider > .thumb.right");

    inputLeft.addEventListener("input", function() {
        leftValue = parseInt(inputLeft.value);
        setLeftValue();
    });
    inputRight.addEventListener("input", function() {
        rightValue = parseInt(inputRight.value);
        setRightValue();
    });

    inputLeft.addEventListener("mouseover", function() {
        thumbLeft.classList.add("hover");
    });
    inputLeft.addEventListener("mouseout", function() {
        thumbLeft.classList.remove("hover");
    });
    inputLeft.addEventListener("mousedown", function() {
        thumbLeft.classList.add("active");
    });
    inputLeft.addEventListener("mouseup", function() {
        thumbLeft.classList.remove("active");
    });

    inputRight.addEventListener("mouseover", function() {
        thumbRight.classList.add("hover");
    });
    inputRight.addEventListener("mouseout", function() {
        thumbRight.classList.remove("hover");
    });
    inputRight.addEventListener("mousedown", function() {
        thumbRight.classList.add("active");
    });
    inputRight.addEventListener("mouseup", function() {
        thumbRight.classList.remove("active");
    });
}