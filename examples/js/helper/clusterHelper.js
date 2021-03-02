/* ---------------------- Variables ---------------------- */
params.clustering = {active: false, images: 0, clusters: 0};
margin = {width: 110, height: 90};

var cluster = new HierarchicalCluster();
var border;

const cnormal = new THREE.Color(0x000000);
const cselected = new THREE.Color(0xf44336);
const cover = new THREE.Color(0x2196F3);
/* ----------------------- Functions --------------------- */

/* Update -------------------------------------------- */
function updateCluster(camera) {
    // Camera information
    var proj = camera.projectionMatrix.clone();
    var world = camera.matrixWorld.clone();
    var inverseWorld = new THREE.Matrix4().getInverse(world);

    var frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(proj, inverseWorld));

    var origin = camera.position.clone();

    // Update the projected points of the images
    Object.values(images).forEach(image => {   
        if(image.camera) {
            image.updatePoints([worldPlane, backgroundSphere]); 
            if(image.camera.name == camera.name) image.distance = 0; // make the current visualized image the priority
            else image.updateDistance(origin);
        }
    });

    // Filter only images that are selected
    var filtered = Object.entries(images).filter(([name, value]) => names.includes(name)).map(([name, value]) => {return value});
    
    // Max of all image distances
    var maxDistanceProjection = Math.max.apply(Math, filtered.map(image => image.distance));

    // Convert the distances to weights and check if the image is visible
    filtered.forEach(image => {
        image.normalizeDistance(maxDistanceProjection);
        image.visible = false;
        Object.values(image.projectedPoints).forEach(p => image.visible = image.visible || frustum.containsPoint(p));
    });

    // Rank weights in descending order
    filtered = filtered.sort((a,b) => (a.weight < b.weight) ? 1 : ((b.weight < a.weight) ? -1 : 0));
    filtered = filtered.filter((i, index) => (index < params.clustering.images));

    // Cluster objects
    cluster.hcluster(filtered);

    // Update the image gallery
    updateImageGallery(cluster.getClusterByNumber(params.clustering.clusters));
}

function updateImageGallery(array) {
    // Container of photo galleries
    var container = document.getElementById("myCluster"); 
    var arrayGallery = [];

    // Create a photo gallery for each cluster
    array.forEach(cluster => {
        // Compute the border position that will have the cluster
        var position = getBorderPosition(cluster.position);
        // Create cluster based on the number of elements
        if(cluster.object.length == 1) var gallery = handleOneCluster(cluster.object[0], position);
        else if(cluster.object.length == 2) var gallery = handleTwoCluster(cluster.object, position);
        else if(cluster.object.length > 2) var gallery = handleMultipleCluster(cluster.object, position);

        // Append the photo gallery to the html main container 
        if(gallery) {
            if(Array.isArray(gallery)) {
                gallery.forEach(g => {
                    arrayGallery.push(g);
                    if(g.new) container.appendChild(g);
                }); 
            }else {
                arrayGallery.push(gallery);
                if(gallery.new) container.appendChild(gallery);
            }
        }
    });

    // Filter the elements that should not be in the screen anymore
    var remove = Array.from(container.children).filter(item => !arrayGallery.includes(item));
    remove.forEach(item => container.removeChild(item));
}

/* Handling ------------------------------------------ */
function handleOneCluster(image, position) {
    var selected = image.camera.children[0].userData.selected;
    if(marker) selected = marker.name == image.camera.name ? marker.name == image.camera.name : selected; 
    var visible = image.visible;
    // Check first if the image is already been displayed   
    var img = document.getElementById(image.camera.name); 
    // If the image already exists, then just move it
    if(img && img.parentElement.size == 1) {
        // Update the border color of the image
        img.style.setProperty('border-color', `#${markerMaterials[image.camera.name].color.getHexString()}`, 'important');
        // Update the container
        var container = img.parentElement;
        setBorder(container, selected);
        setOpacity(container, visible);
        var finalPosition = getFinalPosition(container, position);
        // Check the previous position, if there is a change in the orientation, move only to the corner.
        container.position = finalPosition;
        container.new = false;
        setGalleryPosition(container, finalPosition, img.naturalWidth, img.naturalHeight, selected);
        return container;
    // If still doesnt exist, then create a new one
    } else {
        // Container to hold both images
        var container = document.createElement('div'); 

        // If there is a cluster with this image, start it but at the same psotion
        if(img) {
            if(img.parentElement.size && img.parentElement.size < 3) position = img.parentElement.position;
            else position = img.parentElement.parentElement.position;
        }

        container.new = true;
        container.position = position;
        container.size = 1;

        img = handleGalleryImage(image);
        img.style.width = '100%';
        img.style.height = '100%';

        function loadDataOneCluster() {
            container.setAttribute('class', 'w3-round w3-col w3-center w3-border gallery');
            setGalleryPosition(container, position, img.naturalWidth, img.naturalHeight, selected);
            setBorder(container, selected);
            setOpacity(container, visible);
            container.appendChild(img);
            img.style.display = 'block';
        }

        if(img.complete) {
            loadDataOneCluster();
        } else {
            img.onload = function () { 
                loadDataOneCluster();
            };
        }
        
        return container;
    }
}

function handleTwoCluster(image, position) {
    // Check first if the images are already displayed in the scene
    var img = image.map(i => {
        var item = document.getElementById(i.camera.name);
        if(item) item.style.setProperty('border-color', `#${markerMaterials[i.camera.name].color.getHexString()}`, 'important');
        return item;
    }); 
    var first = img[0];

    var selected = image.map(item => {
        var s = item.camera.children[0].userData.selected;
        if(marker) s = marker.name == item.camera.name ? marker.name == item.camera.name : s; 
        return s;
    });
    selected = selected.some(item => {return item});

    var visible = image.some(item => {return item.visible});

    // Variables for the loading of images
    var counter = 0;
    var size = {
        vertical: {width: 0, height: 0}, 
        horizontal: {width: 0, height: 0}
    };

    // If the images are already in the same cluster element
    if(img.every(item => {return item}) && img.every(item => {
        return item.parentElement == first.parentElement}) && first.parentElement.size == 2) {
        // Update the container 
        var container = first.parentElement;
        setBorder(container, selected);
        setOpacity(container, visible);
        var finalPosition = getFinalPosition(container, position);
        var orientation = finalPosition.orientation == "left" || finalPosition.orientation == "right";
        container.position = finalPosition;
        container.new = false;
        
        img.forEach(item => {
            size = getFinalSize(size, item);

            if(orientation) {
                item.style.width = '100%'; item.style.height = '50%';
            } else {
                item.style.width = '50%'; item.style.height = '100%';
            }
        });

        var scale = Math.min(margin.width / size.vertical.width, margin.height / size.horizontal.height);
        var s = orientation ? size.vertical : size.horizontal;
        setGalleryPosition(container, position, s.width, s.height, selected, scale);
        return container;
    // If some of the images are already displayed, move them to the correct position
    } else if(img.some(item => {return item})) {
        var final = true;
        var movingImg = [];
        
        img.forEach((item, index) => {
            if(item) {
                var container;
                if(item.parentElement.size && item.parentElement.size < 3) container = item.parentElement;
                else container = item.parentElement.parentElement;
                if(!container.position.point.equals(position.point)) {
                    movingImg.push(handleOneCluster(image[index], position));
                    final = final && false;
                }
            }
        });
        if(!final) return movingImg;
    }

    // Container to hold both images
    var container = document.createElement('div'); 
    container.position = position;
    container.size = 2;
    container.new = true;

    var orientation = position.orientation == "left" || position.orientation == "right";

    // Create the image elements 
    img = image.map(item => {return handleGalleryImage(item)});
    img.forEach(item => {
        if(orientation) {
            item.style.width = '100%'; item.style.height = '50%';
        } else {
            item.style.width = '50%'; item.style.height = '100%';
        }
        
        item.onload = function () { 
            item.style.display = 'block';
            size = getFinalSize(size, item);
            counter ++;

            if(counter == img.length) {
                var scale = Math.min(margin.width / size.vertical.width, margin.height / size.horizontal.height);
                var s = orientation ? size.vertical : size.horizontal;

                setGalleryPosition(container, position, s.width, s.height, selected, scale);
                container.setAttribute('class', 'w3-round w3-col w3-center w3-border w3-black w3-border-black gallery');
                setBorder(container, selected);
                setOpacity(container, visible);
                img.forEach(i => container.appendChild(i));
            }
        };
    });

    return container;
}

function handleMultipleCluster(image, position) {
    var selected = image.map(item => {
        var s = item.camera.children[0].userData.selected;
        if(marker) s = marker.name == item.camera.name ? marker.name == item.camera.name : s; 
        return s;
    });
    selected = selected.some(item => {return item});

    var visible = image.some(item => {return item.visible});

    // Check first if the images are already been displayed 
    var img = image.map(i => {
        var item = document.getElementById(i.camera.name);
        if(item) item.style.setProperty('border-color', `#${markerMaterials[i.camera.name].color.getHexString()}`, 'important');
        return item;
    }); 
    var first = img[0];

    // Variable for image loading
    var counter = 0; var maxWidth = 0; var maxHeight = 0;
    
    if(img.every(item => {return item}) && img.every(item => {
        return item.parentElement == first.parentElement}) && first.parentElement.parentElement.size == image.length) {
        // Update the container 
        var container = first.parentElement.parentElement;
        setBorder(container, selected);
        setOpacity(container, visible);
        var finalPosition = getFinalPosition(container, position);
        // Check the previous position, if there is a change in the orientation, move only to the corner.
        container.position = finalPosition;
        container.new = false;

        img.forEach(item => {
            maxWidth = Math.max(maxWidth, item.naturalWidth);
            maxHeight = Math.max(maxHeight, item.naturalHeight);
        });

        var bigImg = Array.from(container.getElementsByTagName('img')).find(i => i.parentElement == container);
        setGalleryPosition(container, finalPosition, 0.75*bigImg.naturalWidth + 0.25*maxWidth, 0.75*bigImg.naturalHeight, selected);
        container.style.display = 'flex';
        return container;
    } else if(img.some(item => {return item})) {
        var final = true;
        var movingImg = [];
        
        img.forEach((item, index) => {
            if(item) {
                var container;
                if(item.parentElement.size && item.parentElement.size < 3) container = item.parentElement;
                else container = item.parentElement.parentElement;
                if(!container.position.point.equals(position.point)) {
                    movingImg.push(handleOneCluster(image[index], position));
                    final = final && false;
                }
            }
        });
        if(!final) return movingImg;
    }

    // Container to hold both images
    var container = document.createElement('div'); 
    container.position = position;
    container.size = image.length;
    container.new = true;

    var bigImg = handleGalleryImage(image[0]);
    bigImg.removeAttribute("id");
    bigImg.style.width = "75%";
    bigImg.style.height = "100%";
    bigImg.style.cursor = "default";
    bigImg.onload = function () { 
        bigImg.style.display = 'block';
    };

    var scroll = document.createElement('div'); 
    scroll.setAttribute('class', 'gallery-scroll');
    scroll.setAttribute('style', 'width: 25%; height: 100%; overflow: scroll;');

    img = image.map(item => {return handleGalleryImage(item, true, bigImg)});
    img.forEach(item => {
        item.onload = function () { 
            maxWidth = Math.max(maxWidth, item.naturalWidth);
            maxHeight = Math.max(maxHeight, item.naturalHeight);

            counter ++;

            if(counter == img.length) {
                setGalleryPosition(container, position, 0.75*bigImg.naturalWidth + 0.25*maxWidth, 0.75*bigImg.naturalHeight, selected);
                container.setAttribute('class', 'w3-round w3-col w3-center w3-border w3-black w3-border-black gallery');
                setBorder(container, selected);
                setOpacity(container, visible);
                container.style.display = 'flex';
                img.forEach(i => i.style.display = 'block');
            }
        };
        scroll.appendChild(item);
    });

    container.appendChild(bigImg);
    container.appendChild(scroll);
    return container;
}

function handleGalleryImage(image, event = true, bigImage = undefined) {
    var img = document.createElement('img');
    var color =  markerMaterials[image.camera.name].color;
    img.src = image.url || 'data/uv.jpg';
    img.setAttribute('id', image.camera.name);
    img.setAttribute('title', 'image: ' + image.camera.name);

    if(event) {
        img.addEventListener("mouseover", event => {
            if(bigImage) bigImage.src = image.url || 'data/uv.jpg';
            onImageMouseOver();
        });
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
    }

    img.setAttribute('class', 'w3-image w3-border w3-round');
    img.setAttribute('style', `cursor:pointer; display:none; border-color:#${color.getHexString()}!important`);

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
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
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

function getAddPosition(orientation, margin, w, h, selected) {
    const widthHalf = w/2, heightHalf = h/2;

    switch (orientation) {
        case 'left':
            return new THREE.Vector2(Math.max(0, margin.width - w), margin.height - heightHalf);
        case 'right':
            //if(selected) return new THREE.Vector2(margin.width - Math.abs(w - margin.width), margin.height - heightHalf);
            return new THREE.Vector2(margin.width, margin.height - heightHalf);
        case 'bottom':
            //if(selected) return new THREE.Vector2(margin.width - widthHalf, margin.height - Math.abs(h - margin.height));
            return new THREE.Vector2(margin.width - widthHalf, margin.height);
        case 'top':
            return new THREE.Vector2(margin.width - widthHalf, Math.max(0, margin.height - h));
        default:
            return new THREE.Vector2(0, 0);
    }
}

function getPositionInTime(direction, key, container, position) {
    const step = 20.;
    var finalPosition = {...container.position};

    switch(direction) {
        case 'right':
            finalPosition.point.add(new THREE.Vector2(step, 0.));
            if(container.position.orientation == position.orientation) {
                if(position.point.x < finalPosition.point.x) finalPosition = {...position};
            } else if(border.size.width < finalPosition.point.x)  
                finalPosition = {point: border.points[key].clone(), orientation: 'right'};
            break;
        case 'down':
            finalPosition.point.add(new THREE.Vector2(0., step));
            if(container.position.orientation == position.orientation) {
                if(position.point.y < finalPosition.point.y) finalPosition = {...position};
            } else if(border.size.height < finalPosition.point.y)  
                finalPosition = {point: border.points[key].clone(), orientation: 'bottom'};
            break;
        case 'left':
            finalPosition.point.add(new THREE.Vector2(-step, 0.));
            if(container.position.orientation == position.orientation) {
                if(position.point.x > finalPosition.point.x) finalPosition = {...position};
            } else if(0 > finalPosition.point.x)  
                finalPosition = {point: border.points[key].clone(), orientation: 'left'};
            break;
        case 'up':
            finalPosition.point.add(new THREE.Vector2(0., -step));
            if(container.position.orientation == position.orientation) {
                if(position.point.y > finalPosition.point.y) finalPosition = {...position};
            } else if(0 > finalPosition.point.y)  
                finalPosition = {point: border.points[key].clone(), orientation: 'top'};
            break;
        default:
            break;
    }
    return finalPosition;
}

function getFinalPosition(container, position) {
    if(container.position.point.equals(position.point)) return position;
    else {
        var distance = {};
        Object.keys(border.points).filter(k => k != "center").forEach(k => {
            var p = border.points[k].clone();
            distance[k] = p.distanceTo(position.point.clone());
        });

        switch (container.position.orientation) {
            case 'top':
                if((container.position.orientation == position.orientation && container.position.point.x < position.point.x) 
                    || (distance["topright"] < distance["topleft"])) return getPositionInTime("right", "topright", container, position);
                else return getPositionInTime("left", "topleft", container, position);
            case 'right':
                if((container.position.orientation == position.orientation && container.position.point.y > position.point.y) 
                    || (distance["topright"] < distance["bottomright"])) return getPositionInTime("up", "topright", container, position);
                else return getPositionInTime("down", "bottomright", container, position);
            case 'bottom':
                if((container.position.orientation == position.orientation && container.position.point.x > position.point.x) 
                    || (distance["bottomleft"] < distance["bottomright"])) return getPositionInTime("left", "bottomleft", container, position);
                    else return getPositionInTime("right", "bottomright", container, position);
            case 'left':
                if((container.position.orientation == position.orientation && container.position.point.y < position.point.y) 
                    || (distance["bottomleft"] < distance["topleft"])) return getPositionInTime("down", "bottomleft", container, position);
                else return getPositionInTime("up", "topleft", container, position);
            default:
                return position;
        }
    }
}

function getFinalSize(size, item) {
        size.vertical.width = Math.max(size.vertical.width, item.naturalWidth);
        size.vertical.height += item.naturalHeight;

        size.horizontal.width += item.naturalWidth;
        size.horizontal.height = Math.max(size.horizontal.height, item.naturalHeight);

    return size;
}

/* Sets ---------------------------------------------- */
function setGalleryPosition(container, position, width, height, selected, scale = 0) {
    if(scale == 0) {
        var max = Math.max(width, height);
        scale = max == height ? margin.height / max : margin.width / max;
    }

    if(selected) scale *= 1.;
    else scale *= 0.8;
    var pos = position.point.clone().add(getAddPosition(position.orientation, margin, width*scale, height*scale, selected));
    var color = selected ? cselected : cnormal;

    var style = `width:${width*scale}px; height:${height*scale}px; left:${pos.x}px; top:${pos.y}px;
         background:#${color.getHexString()} !important; border-color:#${color.getHexString()} !important;`;
    if(position.orientation == 'top' || position.orientation == 'bottom') container.setAttribute('style', style + ' display: flex;');
    else container.setAttribute('style', style);
}

function setOpacity(container, visible) {
    container.classList.remove("w3-opacity");

    if(!visible) container.className += " w3-opacity";
}
function setBorder(container, selected) {
    container.classList.remove("w3-border");
    container.classList.remove("w3-border-large");

    if(selected) container.className += " w3-border-large";
    else  container.className += " w3-border";
}
