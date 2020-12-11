/* ---------------------- Variables ---------------------- */
const margin = new THREE.Vector2(144., 116.);
// Create a container that will hold the scene
var stage = new PIXI.Container();

/* Handling ------------------------------------------ */
function handleImageThumbnail(camera, type, height, border) {
    var img = parent.document.createElement('img');
    img.src = server + params.collection + images[camera.name];
    img.setAttribute('id', camera.name+type);
    img.setAttribute('title', 'image: ' + camera.name);
    img.setAttribute('class', border + ' w3-image w3-border-black w3-round w3-hover-border-blue');
    img.setAttribute('style', height + 'cursor:pointer;');
    img.onclick = function () {
        setCamera(camera);
    };
    return img;
}

function handleBasicThumbnail(camera) {
    if(params.collection && window.location !== window.parent.location) {
        var container = parent.document.getElementById('rowSlider');
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-col w3-center');
        div.setAttribute('style', 'width:150px;flex-shrink:0;');

        var img = handleImageThumbnail(camera, '-slider', 'height:100px;', 'w3-border-large');

        div.appendChild(img);
        container.appendChild(div);

        [].map.call(container.children, Object)
        .sort((a, b) => a.children[0].id.localeCompare(b.children[0].id))
        .forEach(elem => container.appendChild(elem));
    }
}

function handleOneClusterThumbnail(camera, container, position, list) {
    if(params.collection && window.location !== window.parent.location) {
        const width = 150, height = 100;

        var finalPosition = position.point.clone().add(
            getImageAddPosition(position.border, width, height));

        // Check if the thumbnail already exists
        var img = parent.document.getElementById(camera.name+'-cluster');

        if(img  && img.parentElement.parentElement.isSameNode(container)) {
            var div = img.parentElement;
            div.setAttribute('style', 'width:'+width+'px;left:'+finalPosition.x+'px;top:'+finalPosition.y+'px;');
            // Remove it from the list of existing thumbnails
            const index = list.indexOf(img);
            if (index > -1) list.splice(index, 1);
        } else { // If it doesnt exists, create a new one
            var div = parent.document.createElement('div');
            div.setAttribute('class', 'w3-padding-small w3-col w3-center w3-animate-opacity cluster');
            div.setAttribute('style', 'width:'+width+'px;left:'+finalPosition.x+'px;top:'+finalPosition.y+'px;');

            img = handleImageThumbnail(camera, '-cluster', 'height:'+height+'px;', 'w3-border-large');

            div.appendChild(img);
            container.appendChild(div);
        }
    }
}

function handleTwoClusterThumbnail(camera1, camera2, container, position, list) {
    if(params.collection && window.location !== window.parent.location) {
        var borderCheck = position.border == 'left' || position.border == 'right';
        const width = borderCheck ? 150  : 80; 
        const heightImage = borderCheck ? 44.8 : 47.5;
        const height = borderCheck ? 2*heightImage : heightImage;
        var display = borderCheck ? '' : 'flex-direction:column;';

        var finalPosition = position.point.clone().add(
            getImageAddPosition(position.border, width, height));

        // Check if the thumbnails already exists
        var img1 = parent.document.getElementById(camera1.name+'-cluster');
        var img2 = parent.document.getElementById(camera2.name+'-cluster');

        if(img1 && img2 && img1.parentElement.isSameNode(img2.parentElement)
            && img1.parentElement.childElementCount == 2) {
            var div = img2.parentElement.parentElement;
            div.setAttribute('style', 'width:'+width+'px;left:'+finalPosition.x+'px;top:'+finalPosition.y+'px;');
            // Remove both from the list of existing thumbnails
            const index1 = list.indexOf(img1);
            const index2 = list.indexOf(img2);
            if (index1 > -1) list.splice(index1, 1);
            if (index2 > -1) list.splice(index2, 1);
        } else {
            div = parent.document.createElement('div');
            div.setAttribute('class', 'w3-padding-small w3-col w3-center w3-animate-opacity cluster');
            div.setAttribute('style', 'width:'+width+'px;left:'+finalPosition.x+'px;top:'+finalPosition.y+'px;');

            var box = parent.document.createElement('div');
            box.setAttribute('class', 'w3-round w3-black');
            box.setAttribute('style', 'display:flex;height:fit-content;width:fit-content;' + display);

            img1 = handleImageThumbnail(camera1, '-cluster', 'height:'+heightImage+'px;', 'w3-border-large');
            img2 = handleImageThumbnail(camera2, '-cluster', 'height:'+heightImage+'px;', 'w3-border-large');

            div.appendChild(box);
            box.appendChild(img1);
            box.appendChild(img2);
            container.appendChild(div);
        }
    }
}

function handleMultipleClusterThumbnail(cameras, container, position, list) {
    if(params.collection && window.location !== window.parent.location) {
        var borderCheck = position.border == 'left' || position.border == 'right';
        const width = borderCheck ? 150  : 185; 
        const height = borderCheck ? 134 : 108;
        var display = borderCheck ? 'flex-direction:column;' : '';
        var styleSlider = borderCheck ? 'overflow-x:auto;' : 'height:96px;overflow-y:auto;flex-direction:column;';

        var finalPosition = position.point.clone().add(
            getImageAddPosition(position.border, width, height));

        div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center w3-animate-opacity cluster');
        div.setAttribute('style', 'width:'+width+'px;left:'+finalPosition.x+'px;top:'+finalPosition.y+'px;');

        var box = parent.document.createElement('div');
        box.setAttribute('class', 'w3-round w3-black');
        box.setAttribute('style', 'display:flex;height:auto;width:auto;' + display);

        var img = handleImageThumbnail(cameras[0].camera, '-cluster', 'height:96px;', 'w3-border-large');
        img.setAttribute('style', 'height:96px;max-width:auto;cursor:pointer;');

        var slider = parent.document.createElement('div');
        slider.setAttribute('class', 'w3-col w3-round');
        slider.setAttribute('style', 'display:flex;' + styleSlider);

        var number = parent.document.createElement('div');
        number.setAttribute('class', 'w3-small w3-padding-small w3-pink w3-border w3-border-black w3-round w3-image');
        number.setAttribute('style', 'height:25px;width:35px;');
        number.innerHTML += cameras.length;
        slider.appendChild(number);

        cameras.forEach(cam => {
            var miniImg = handleImageThumbnail(cam.camera, '-cluster', 'height:25px;max-width:35px;', 'w3-border');
            miniImg.onclick = function () {
                var camera = cam.camera;
                setThumbnail(camera.name, '-cluster', 'w3-border');
                img.src = server + params.collection + images[camera.name];
                img.setAttribute('id', camera.name+'-cluster');
                img.setAttribute('title', 'image: ' + camera.name);
                img.onclick = function () {
                    setCamera(camera);
                };
            };
            slider.appendChild(miniImg);
        });

        div.appendChild(box);
        box.appendChild(img);
        box.appendChild(slider);
        container.appendChild(div);

        /*
        var width = position < 2 ? 'width:150px;' : 'width:185px;';
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center');
        div.setAttribute('style', width + 'flex-shrink:0;');

        var box = parent.document.createElement('div');
        box.setAttribute('class', 'w3-black w3-round w3-border w3-border-black');
        position < 2 ? box.setAttribute('style', 'display:flex;flex-direction:column;') : box.setAttribute('style', 'display:flex;height:100px;');

        var img = handleImageThumbnail(cameras[0].camera, '-cluster', 'height:96px;', 'w3-border');
        img.setAttribute('style', 'height:96px;max-width:130px;cursor:pointer;');

        var slider = parent.document.createElement('div');
        slider.setAttribute('class', 'w3-col w3-round');
        position < 2 ? slider.setAttribute('style', 'overflow-x:auto;display:flex;') : slider.setAttribute('style', 'height:96px;overflow-y:auto;display:flex;flex-direction:column;');

        var number = parent.document.createElement('div');
        number.setAttribute('class', 'w3-small w3-round w3-padding-small w3-black');
        number.innerHTML += cameras.length;
        slider.appendChild(number);

        cameras.forEach(cam => {
            var miniImg = handleImageThumbnail(cam.camera, '-cluster', 'height:25px;max-width:35px;', 'w3-border');
            miniImg.onclick = function () {
                var camera = cam.camera;
                setThumbnail(camera.name, "-cluster");
                img.src = server + params.collection + images[camera.name];
                img.setAttribute('id', camera.name+"-cluster");
                img.setAttribute('title', 'image: ' + camera.name);
                img.onclick = function () {
                    setCamera(camera);
                };
            };
            slider.appendChild(miniImg);
        });

        div.appendChild(box);
        box.appendChild(img);
        box.appendChild(slider);
        container.appendChild(div);

        */
    }
}

/* Gets ---------------------------------------------- */
function get2DPosition(point, camera, width, height) {
    var widthHalf = width/2, heightHalf = height/2;

    var p = point.clone();
    var vector = p.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return new THREE.Vector2().copy(vector);
}

function getPositionThumbnail(position, width, height) {
    // TODO: remove (generates a random position)
    var random = new THREE.Vector2(Math.random() * width, Math.random() * height);

    // Compute the four points inside the limits of the canvas 
    var positionLimit = random.clone().max(new THREE.Vector2())
    .min(new THREE.Vector2(width, height));

    var arr = ['left', 'right', 'bottom', 'top']; 
    var limits = [new THREE.Vector2(0, positionLimit.y), new THREE.Vector2(width, positionLimit.y),
        new THREE.Vector2(positionLimit.x, height), new THREE.Vector2(positionLimit.x, 0)];

    var border = limits.map((p, index) => {
        var distance = random.clone().distanceToSquared(p);
        var result = {point: p, distance: distance, border: arr[index]};  
        return result;
    });

    // Find the smallest distance from the position of the thumbnail to the border
    var min = border.reduce(function(prev, curr) {
        return prev.distance < curr.distance ? prev : curr;
    });

    return min;
}

function getImageAddPosition(position, width, height) {
    const widthHalf = width/2, heightHalf = height/2;

    switch (position) {
        case 'left':
          return new THREE.Vector2(0, margin.y - heightHalf);
        case 'right':
            return new THREE.Vector2(margin.x - 4, margin.y - heightHalf);
        case 'bottom':
            return new THREE.Vector2(margin.x - widthHalf, margin.y);
        case 'top':
            return new THREE.Vector2(margin.x - widthHalf, 8);
        default:
            return new THREE.Vector2(0, 0);
      }
}

/* Sets ---------------------------------------------- */
function setThumbnail(camera, type, border) {
    if(window.location !== window.parent.location) {
        old = parent.document.getElementsByClassName("selected"+type);
        for (i = 0; i < old.length; i++)
            old[i].className = "w3-image w3-border-black w3-round w3-hover-border-blue "+border;
        
        img = parent.document.getElementById(camera+type);
        if(img) img.className = "selected" + type + " w3-image w3-border-blue w3-round "+border;
    }
}

/* Update -------------------------------------------- */
function updateClusterThumbnail(clusters) {
    if(params.collection && window.location !== window.parent.location) {

        /*
        // 2D canvas
        var canvas = view.mainLoop.gfxEngine.renderer.getContext().canvas;
        const width = canvas.width, height = canvas.height;

        // Create thumbnails for each cluster
        clusters.forEach(cluster => {
            // Compute the screen position for the cluster and gets the border position
            // of the thumbnail
            var clusterPosition = get2DPosition(cluster.worldPos, viewCamera, width, height);
            var borderPosition = getPositionThumbnail(clusterPosition, width, height);

         
            if(!Array.isArray(cluster.object)) {
                var inset = new Inset();
                inset.loadImage('https://histovis.s3.eu-west-3.amazonaws.com/collections/niepce/img/1989.57.16.27.jpg', 0, 0);
                stage.addChild(inset.thumbnail);
            }
        });
        */

        // 2D canvas
        var canvas = view.mainLoop.gfxEngine.renderer.getContext().canvas;
        const width = canvas.width, height = canvas.height;

        var container = parent.document.getElementById("myCluster"); 
        var existingImages = Array.from(container.querySelectorAll('*[id]')).map(img => {return img});
        
        // Create thumbnails for each cluster
        clusters.forEach(cluster => {
            // Compute the screen position for the cluster and gets the border position
            // of the thumbnail
            var clusterPosition = get2DPosition(cluster.worldPos, viewCamera, width, height);
            var borderPosition = getPositionThumbnail(clusterPosition, width, height);

            if(!Array.isArray(cluster.object)) handleOneClusterThumbnail(cluster.object.camera,
                container, borderPosition, existingImages);
            else if(cluster.object.length == 2) handleTwoClusterThumbnail(cluster.object[0].camera,
                cluster.object[1].camera, container, borderPosition, existingImages);
            else handleMultipleClusterThumbnail(cluster.object, container, borderPosition, existingImages);
        });

        // Remove the thumbnails that are not visible
        existingImages.forEach(img => {
            var div = img.parentElement;
            if(!div.parentElement.isSameNode(container)) div = div.parentElement;
            if(div.parentElement != null) div.parentElement.removeChild(div);
        });

        /*

        // Clean (TODO: fluid interaction)
        var arr = ["leftCluster", "rightCluster", "bottomCluster", "topCluster"]; 
        arr.forEach(emptyThumbnail);

        // Create thumbnails for each cluster
        clusters.forEach(cluster => {
            // Compute the screen position for the cluster
            var position = get2DPosition(cluster.worldPos, viewCamera, canvas.width, canvas.height);

            var positionLimit = new THREE.Vector2();
            positionLimit.x =  Math.min(Math.max(position.x, 0), canvas.width);
            positionLimit.y =  Math.min(Math.max(position.y, 0), canvas.height);

            var limit = [new THREE.Vector2(0, positionLimit.y), new THREE.Vector2(canvas.width, positionLimit.y),
                new THREE.Vector2(positionLimit.x, canvas.height), new THREE.Vector2(positionLimit.x, 0)];

            var border = arr.map((p, index) => {
                var point = limit[index];
                var distance = position.clone().distanceToSquared(point);
                var result = {point: point, distance: distance, position: p, index: index};  
                return result;
            });
            var min = border.reduce(function(prev, curr) {
                return prev.distance < curr.distance ? prev : curr;
            });
            //var i = Math.floor(Math.random() * arr.length);
            var container = parent.document.getElementById(min.position); 

            if(!Array.isArray(cluster.object)) handleOneClusterThumbnail(cluster.object.camera, container);
            else if(cluster.object.length == 2) handleTwoClusterThumbnail(cluster.object[0].camera, cluster.object[1].camera, container, min.index);
            else handleMultipleClusterThumbnail(cluster.object, container, min.index);
        });
        */
    }
}

/* Clean --------------------------------------------- */
function emptyThumbnail(div){
    var container = parent.document.getElementById(div);
    if(container) container.innerHTML = '';
}