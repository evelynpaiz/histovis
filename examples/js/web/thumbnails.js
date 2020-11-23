
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

        var img = handleImageThumbnail(camera, '-slider', 'height:100px;', 'w3-border');

        div.appendChild(img);
        container.appendChild(div);

        [].map.call(container.children, Object)
        .sort((a, b) => a.children[0].id.localeCompare(b.children[0].id))
        .forEach(elem => container.appendChild(elem));
    }
}

function handleOneClusterThumbnail(camera, container) {
    if(params.collection && window.location !== window.parent.location) {
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center');
        div.setAttribute('style', 'width:150px;flex-shrink:0;');

        var img = handleImageThumbnail(camera, '-cluster', 'height:100px;', 'w3-border-large');

        div.appendChild(img);
        container.appendChild(div);
    }
}

function handleTwoClusterThumbnail(camera1, camera2, container, position) {
    if(params.collection && window.location !== window.parent.location) {
        var width = position < 2 ? 'width:150px;' : 'width:80px;';
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center');
        div.setAttribute('style', width + 'flex-shrink:0;');

        var display = position < 2 ? '' : 'flex-direction:column;';
        var box = parent.document.createElement('div');
        box.setAttribute('class', 'w3-black w3-round w3-border w3-border-black');
        box.setAttribute('style', 'display:flex;' + display);

        var height = position < 2 ? 'height:44.8px;' : 'height:47.5px;';
        var img1 = handleImageThumbnail(camera1, '-cluster', height, 'w3-border');
        var img2 = handleImageThumbnail(camera2, '-cluster', height, 'w3-border');

        div.appendChild(box);
        box.appendChild(img1);
        box.appendChild(img2);
        container.appendChild(div);
    }
}

function handleMultipleClusterThumbnail(cameras, container, position) {
    if(params.collection && window.location !== window.parent.location) {
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
    }
}

/* Sets ---------------------------------------------- */
function setThumbnail(camera, type) {
    if(window.location !== window.parent.location) {
        old = parent.document.getElementsByClassName("selected"+type);
        for (i = 0; i < old.length; i++)
            old[i].className = "w3-image w3-border w3-border-black w3-round w3-hover-border-blue";
        
        img = parent.document.getElementById(camera+type);
        if(img) img.className = "selected" + type + " w3-image w3-border w3-border-blue w3-round";
    }
}

/* Update -------------------------------------------- */
function updateClusterThumbnail(clusters) {
    if(params.collection && window.location !== window.parent.location) {

        // Clean (TODO: fluid interaction)
        var arr = ["leftCluster", "rightCluster", "bottomCluster", "topCluster"]; 
        arr.forEach(emptyThumbnail);

        // Create thumbnails for each cluster
        clusters.forEach(cluster => {
            // Random choose place (TODO: depend on the position of the cluster)
            var i = Math.floor(Math.random() * arr.length);
            var container = parent.document.getElementById(arr[i]); 

            if(!Array.isArray(cluster.object)) handleOneClusterThumbnail(cluster.object.camera, container);
            else if(cluster.object.length == 2) handleTwoClusterThumbnail(cluster.object[0].camera, cluster.object[1].camera, container, i);
            else handleMultipleClusterThumbnail(cluster.object, container, i);
        });
    }
}

/* Clean --------------------------------------------- */
function emptyThumbnail(div){
    var container = parent.document.getElementById(div);
    if(container) container.innerHTML = '';
}