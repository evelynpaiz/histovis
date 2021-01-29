/* ---------------------- Variables ---------------------- */
params.clustering = {apply: false, images: 5, clusters: 3};
margin = {width: 110, height: 90};

var cluster = new HierarchicalCluster();
var border;

/* ----------------------- Functions --------------------- */

/* Update -------------------------------------------- */
function updateCluster(camera) {
    var inverseProj = new THREE.Matrix4().getInverse(camera.projectionMatrix.clone());
    var world = camera.matrixWorld.clone();

    var origin = camera.position.clone();
    var direction = new THREE.Vector3(  0,  0,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize();

    var ray = new THREE.Raycaster(origin, direction);
    var rayIntersects = ray.intersectObjects([worldPlane, backgroundSphere], true);

    if(rayIntersects.length > 0.) {
        var point = rayIntersects[0].point;

        // Compute distances
        Object.values(images).forEach(image => image.updateDistance(point));

        // Max of all image distances
        var maxDistanceProjection = Math.max.apply(Math, Object.values(images).map(image => image.distance));

        // Convert the distances to weights
        Object.values(images).forEach(image => image.normalizeDistance(maxDistanceProjection));

        // Rank weights in descending order
        var filtered = Object.values(images).sort((a,b) => (a.weight.mean < b.weight.mean) ? 1 : ((b.weight.mean < a.weight.mean) ? -1 : 0));
        filtered = filtered.filter((i, index) => (index < params.clustering.images));

        // Cluster objects
        cluster.hcluster(filtered);

        // Update the image gallery
        updateImageGallery(cluster.getClusterByNumber(params.clustering.clusters));
    }
}

function updateImageGallery(array) {
    // Checks if it has a parent document
    if(window.location !== window.parent.location) {
        // Container of photo galleries
        var container = parent.document.getElementById("myCluster"); 
        //container.innerHTML = "";

        // Create a photo gallery for each cluster
        array.forEach(cluster => {
            // Compute the border position that will have the cluster
            var position = getBorderPosition(cluster.position);
            // Create cluster based on the number of elements
            if(cluster.object.length == 1) var gallery = handleOneCluster(cluster, position);
            // Append the photo gallery to the html main container 
            if(gallery) container.appendChild(gallery);
        });
    }
}

/* Handling ------------------------------------------ */
function handleOneCluster(cluster, position) {
    var image = cluster.object[0];
    var selected = image.camera.children[0].userData.selected;
    if(marker) selected = marker.name == image.camera.name ? marker.name == image.camera.name : selected; 
    // Check first if the image is already been displayed   
    var img = parent.document.getElementById(image.camera.name); 

    // If the image already exists, then just move it
    if(img) {
        var container = img.parentElement;
        setBorder(img, selected);

        // Check the previous position, if there is a change in the orientation, move only to the corner.
        var finalPosition;
        if(container.position.orientation == position.orientation) finalPosition = position;
        else {
            switch (container.position.orientation) {
                case 'top':
                    finalPosition = {point: border.points.topright, orientation: 'right'};
                    break;
                case 'right':
                    finalPosition = {point: border.points.bottomright, orientation: 'bottom'};
                    break;
                case 'bottom':
                    finalPosition = {point: border.points.bottomleft, orientation: 'left'};
                    break;
                case 'left':
                    finalPosition = {point: border.points.topleft, orientation: 'top'};
                    break;
                default:
                    finalPosition = position;
            }
        }

        container.position = finalPosition;
        setGalleryPosition(container, position, img.naturalWidth, img.naturalHeight, selected);
    // If still doesnt exist, then create a new one
    } else {
        var container = document.createElement('div'); 
        container.position = position;

        img = handleGalleryImage(image, margin);
        img.style.display = 'none';

        setBorder(img, selected);

        img.onload = function () { 
            container.setAttribute('class', 'w3-round w3-col w3-center cluster');
            setGalleryPosition(container, position, img.naturalWidth, img.naturalHeight, selected);
            img.style.display = 'block';
        };
    
        container.appendChild(img);
        return container;
    }
}

function handleGalleryImage(image) {
    var img = parent.document.createElement('img');
    img.src = image.url || 'data/uv.jpg';
    img.setAttribute('id', image.camera.name);
    img.setAttribute('title', 'image: ' + image.camera.name);

    img.addEventListener("mouseover", onImageMouseOver);
    img.addEventListener("mouseout", onImageMouseOut);

    img.addEventListener('click', event => {
        params.mouse.timer = setTimeout(function() {
        if (!params.mouse.prevent) {
            onImageMouseClick();
        }
        params.mouse.prevent = false;
        }, params.mouse.delay);
    });

    img.addEventListener('dblclick', event => {
        clearTimeout(params.mouse.timer);
        params.mouse.prevent = true;
        onImageMouseDblClick();
    });

    img.setAttribute('class', 'w3-image w3-border w3-border-blue w3-round');
    img.setAttribute('style', 'max-width:100%; max-height:100%; cursor:pointer;');

    return img;

    function onImageMouseOver() {
        marker = image.camera.children[0];
        scaleCameraHelper();
        if(!marker.userData.selected){
            multipleTextureMaterial.setCamera(image.camera);
        }
    }

    function onImageMouseOut() {
        marker = image.camera.children[0];
        downscaleCameraHelper();
        if(!marker.userData.selected) {
            multipleTextureMaterial.removeCamera(image.camera);
        }
        marker = new THREE.Group();
    }

    function onImageMouseClick() {
        marker = image.camera.children[0];
        if(!marker.userData.selected) {
            marker.userData.selected = true;
            multipleTextureMaterial.setCamera(image.camera);
        } else {
            marker.userData.selected = false;
            multipleTextureMaterial.removeCamera(image.camera);
        }
    }
    
    function onImageMouseDblClick() {
        marker = image.camera.children[0];
        setCamera(image.camera);
    }
}

/* Gets ---------------------------------------------- */
function get2DPosition(point, width, height) {
    var widthHalf = width/2, heightHalf = height/2;

    var p = point.clone();
    var vector = p.project(viewCamera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return new THREE.Vector2().copy(vector);
}

function getBorderPosition(p) {
    // Compute the screen position for the cluster and gets the border position
    // of the cluster if it is outside the canvas.
    var screenPosition = get2DPosition(p, width, height)
        .max(new THREE.Vector2()).min(new THREE.Vector2(width, height)); 

    // Computes a continous function in a radial manner, dividing the 
    // canvas in 4 triangles (the center is the only problematic point)
    var finalPosition = border.getBorderPosition(screenPosition);

    if(finalPosition) return finalPosition;
    else {
        console.warn("Border error calculation");
        return {point: new THREE.Vector2(0, 0), orientation: 'left'};
    }
}

function getFinalPosition(orientation, margin, width, height) {
    const widthHalf = width/2, heightHalf = height/2;

    switch (orientation) {
        case 'left':
        return new THREE.Vector2(margin.width - width, margin.height - heightHalf);
        case 'right':
            return new THREE.Vector2(margin.width + 0.5, margin.height - heightHalf);
        case 'bottom':
            return new THREE.Vector2(margin.width - widthHalf, margin.height + 1.);
        case 'top':
            return new THREE.Vector2(margin.width - widthHalf, margin.height - height + 1.);
        default:
            return new THREE.Vector2(0, 0);
    }
}

/* Sets ---------------------------------------------- */
function setGalleryPosition(container, position, width, height, selected) {
    var max = Math.max(width, height);
    var scale = max == width ? margin.width / max : margin.height / max;

    if(!selected) scale *= 0.75;

    var pos = position.point.clone().add(getFinalPosition(position.orientation, margin, width*scale, height*scale));
    container.setAttribute('style', 'width:' + width*scale + 'px; height:' + height*scale + 'px; left:' + pos.x + 'px;top:' + pos.y+'px;');
}

function setBorder(container, selected) {
    container.classList.remove("w3-border");
    container.classList.remove("w3-border-large");

    if(selected) container.className += " w3-border-large";
    else  container.className += " w3-border";
}