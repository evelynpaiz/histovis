/* ---------------------- Variables ---------------------- */
var server = 'https://histovis.s3.eu-west-3.amazonaws.com/';
var width, height;

var prevCamera = new PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera();

var renderer, scene, cameras, controls;
var environment, backgroundSphere, worldPlane;

var composer, scenePass;

var basicMaterial, wireMaterial, textureMaterial, multipleTextureMaterial, viewMaterials = {};
var textureMaterialUniforms, multipleTextureMaterialUniforms, viewMaterialUniforms, sceneMaterialUniforms;

var textureLoader = new THREE.TextureLoader();
const uvTexture = textureLoader.load('data/uv.jpg');
var textures = {}, images = {};

var params = {
    collection: undefined,
    cameras: {size: 10000},
    environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0},
    distortion: {rmax: 1.},
    interpolation: {duration: 3.}
};

var clock = new THREE.Clock();
var frustum = new THREE.Frustum();

var clusters = new Cluster();

/* ----------------------- Functions --------------------- */

/* Materials ----------------------------------------- */
function initBasicMaterial(){
    return new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        side: THREE.DoubleSide
    });
}

function initWireMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0xffcc66,
        wireframe: true,
    });
}

function initTextureMaterial(vs, fs, map) {
    var uniforms = {
        map: map,
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        vertexColors: THREE.VertexColors,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
        vertexShader: vs,
        fragmentShader: fs
    };

    var material =  new OrientedImageMaterial(uniforms);

    return [uniforms, material];
}

function initMultipleTextureMaterial(vs, fs, map, renderer) {
    // Maximum number of textures
    const maxTextures = getMaxTextureUnitsCount(renderer);

   var uniforms = {
        map: map,
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        vertexColors: THREE.VertexColors,
        blending: THREE.NormalBlending,
        maxTexture: maxTextures,
        side: THREE.DoubleSide,
        vertexShader: vs,
        fragmentShader: fs
    };

   var material =  new MultipleOrientedImageMaterial(cameras, uniforms);

   return [uniforms, material];
};

function initCameraMaterialUniforms(vs, fs, map) {
    var uniforms = {
        map: map,
        opacity: 1,
        transparent: true,
        blending: THREE.NormalBlending,
        vertexShader: vs,
        fragmentShader: fs
    };
    return uniforms;
}

function initSceneMaterialUniforms(vs, fs, material) {
    var uniforms = {
        uniforms: {
            tDiffuse: { value: null },
            diffuse:  { value: new THREE.Color(0xeeeeee) },
            opacity:  { value: 1.},
            debug: { value: material.debug },
            uvwView: { value: material.uvwView },
            uvDistortion: { value: material.uvDistortion },
            distortion: { value: material.distortion },
            extrapolation: { value: material.extrapolation },
            homography: { value: material.homography }
        },
        vertexShader: vs,
        fragmentShader: fs,
    };
    return uniforms;
}

/* Environment --------------------------------------- */
function initBackgroundSphere(material) {
    var sphere = new THREE.SphereBufferGeometry(-1, 32, 32);
    var visibility = new Float32Array(sphere.attributes.position.count); // invisible
    sphere.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
    return new THREE.Mesh(sphere, material);
}

function initWorldPlane(material) {
    var plane = new THREE.PlaneBufferGeometry(-1, -1, 100, 100);
    var visibility = new Float32Array(plane.attributes.position.count); // invisible
    plane.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
    return new THREE.Mesh(plane, material);
}

/* Cameras ------------------------------------------- */
function cameraAspect(camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
}

function cameraHelper(camera) {
    var group = new THREE.Group();
    m = new THREE.Matrix4().getInverse(camera.projectionMatrix);
    var v = new Float32Array(15);
    // get the 4 corners on the near plane (neglecting distortion)
    new THREE.Vector3( -1, -1, -1 ).applyMatrix4(m).toArray(v,  3);
    new THREE.Vector3( -1,  1, -1 ).applyMatrix4(m).toArray(v,  6);
    new THREE.Vector3(  1,  1, -1 ).applyMatrix4(m).toArray(v,  9);
    new THREE.Vector3(  1, -1, -1 ).applyMatrix4(m).toArray(v, 12);

    // place a frustum
    {
        var vertices = v;
        var indices = [0, 1, 2,  0, 2, 3,  0, 3, 4,  0, 4, 1];
        var geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        var mesh = new THREE.Mesh(geometry, wireMaterial);
        mesh.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
        group.add(mesh);
    }
    // place the image plane
    {
        viewMaterials[camera.name] = new OrientedImageMaterial(viewMaterialUniforms);
        setMaterial(viewMaterials[camera.name], camera);
        viewMaterials[camera.name].debug.showImage = true;

        var vertices = v.slice(3);
        var uvs = new Float32Array([ 0., 0.,  0., 1.,  1., 1.,  1., 0.]);
        var visibility = new Float32Array(geometry.attributes.position.count);
        var indices = [0, 2, 1,  0, 3, 2];
        var geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute( uvs, 2 ));
        geometry.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
        var mesh = new THREE.Mesh(geometry, viewMaterials[camera.name]);
        mesh.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
        group.add(mesh);
    }
    // place a sphere at the camera center
    {
        var geometry = new THREE.SphereBufferGeometry(0.03, 8, 8);
        group.add(new THREE.Mesh( geometry, basicMaterial));
    }
    return group;
}

/* Callbacks ----------------------------------------- */
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    renderer.setSize(width, height);
    viewCamera.aspect = aspect;
    viewCamera.updateProjectionMatrix();
} 

function onDocumentKeyDown(event) {
    switch(event.key){
        case 's': setView(getCamera(nextCamera, -1));  break;
        case 'z': setView(getCamera(nextCamera, +1));  break;
        case 'q': setTexture(getCamera(textureCamera, -1));  break;
        case 'd': setTexture(getCamera(textureCamera, +1));  break;
        case 'a': setCamera(getCamera(nextCamera, -1));  break;
        case 'e': setCamera(getCamera(nextCamera, +1));  break;
        case 't': setTexture(getCamera(nextCamera));  break;
        case 'v': setView(getCamera(textureCamera));  break;
        case 'c': console.log(nextCamera); break;
        case 'p': console.log(viewCamera.position); break;
        default : console.log(event.key, 'is not supported');
    }
}

/* Loading ------------------------------------------- */
function loadOrientation(url, source, name) {
    if (!name){
        const match = url.match(/Orientation-(.*)\.[\w\d]*\.xml/i);
        name = match ? match[1] : url;
    }
    return source.open(url, 'text')
        .then(parseOrientation(source))
        .then(handleOrientation(name));
}

function loadImage(url, source, name) {
    if (!name){
        const match = url.match(/([^\/]*)\.[\w\d]/i);
        name = match ? match[1] : url;
    }
    images[name] = url;
    return source.open(url, 'dataURL')
    .then(parseImage(source))
    .then(handleImage(name));
}

function loadOrientedImage(orientationUrl, imageUrl, source, name) {
    loadImage(imageUrl, source).then(() => loadOrientation(orientationUrl, source, name));
}

function loadOrientedImageGroup(json, image, source, name) {
    json.name = name;
    loadImage(image, source)
    .then(parseOrientation(json))
    .then(handleOrientation(name));
}

function loadPlyMesh(url, source, material){
    return source.open(url, 'arrayBuffer')
    .then(parsePly(source))
    .then(handleMesh(url, material));
}

function loadPlyPC(url, source, material){
    return source.open(url, 'arrayBuffer')
    .then(parsePly(source))
    .then(handlePointCloud(url, material));
}

function loadJSON(material, path, file) {
    file = file || 'index.json';
    var source = new FetchSource(path);
    source.open(file, 'text').then((json) => {
        json = JSON.parse(json);

        if(json.target) {
            params.environment.center.copy(json.target);
            if(controls) controls.target.copy(json.target);
        } 

        if(json.camera) {
            if(json.camera.scale) params.cameras.size = json.camera.scale;
            if(json.camera.zoom) viewCamera.zoom = json.camera.zoom;
        }

        if(json.environment) {
            if(json.environment.radius) params.environment.radius = json.environment.radius;
            if(json.environment.epsilon) params.environment.epsilon = json.environment.epsilon;
            if(json.environment.elevation) params.environment.elevation = json.environment.elevation;
        }
        
        if(json.up) viewCamera.up.copy(json.up);
        if(json.pointSize) material.size = json.pointSize;

        updateEnvironment();
        
        if(json.pc) json.pc.forEach((url) => loadPlyPC(url, source, material));
        if(json.mesh) json.mesh.forEach((url) => loadPlyMesh(url, source, material));

        if(json.ori && json.img) json.ori.forEach((orientationUrl, i) => 
            loadOrientedImage(orientationUrl, json.img[i], source));

        if(json.groupimg) Object.keys(json.groupimg).forEach((image) => 
        loadOrientedImageGroup(json[image], 'img/'+image+'.jpg', source, image));
    });
}

/* Parsing ------------------------------------------- */
function parseOrientation(source) {
    var parsers = [MicmacOrientationParser, MatisOrientationParser, GoogleOrientationParser];
    return (data) => {
        for(const parser of parsers) {
            var parsed = parser.parse(data, source);
            if (parsed) return parsed;
        }
        return undefined;
    }
}

function parseImage(source){
    return (data) => {
        return new Promise((resolve, reject) => {
            textureLoader.load(data, resolve, undefined, reject)
        }).finally(() => source.close(data, 'dataURL'));
    }
}

var plyLoader = new PLYLoader();
var parsePly = (source) => (data => plyLoader.parse(data));

/* Handling ------------------------------------------ */
function handleOrientation(name) {
    return function(camera) {
        if (!camera) return;
        handleCamera(camera, name);
        if(window.location !== window.parent.location) {
            handleBasicThumbnail(camera);
        }
        if(cameras.children.length < 2) setCamera(camera);
        return camera;
    };
}

function handleCamera(camera, name){
    if (!camera) return;
    camera.name = name;
    if (cameras.children.find(cam => cam.name == camera.name)) {
        console.warn(`Camera "${camera.name}" was already loaded, skipping`);
        return;
    }
    var check = '[?]';
    if (camera.check) check = camera.check() ? '[Y]' : '[N]';
    console.log(check, name);
    
    camera.far = params.environment.radius+params.environment.epsilon;
    camera.near = 0.1;
    camera.setDistortionRadius();
    camera.updateProjectionMatrix();
    var helper = cameraHelper(camera);
    helper.name = "helper";
    camera.add(helper);
    camera.updateMatrixWorld();

    cameras.add(camera);
    cameras.children.sort((a, b) => a.name.localeCompare(b.name));
}

function handleImage(name) {
    return function(texture) {
        if (!texture) return;
        texture.name = name;
        textures[texture.name] = texture ;
        return texture;
    };
}

function handlePointCloud(name, material){
    return function(geometry){
        console.log(name);
        var points = new THREE.Points(geometry, material);
        environment.add(points);
        // Find center of the geometry
        geometry.computeBoundingBox();
        var center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        points.updateMatrixWorld(true);

        var visibility = new Float32Array(Array(geometry.attributes.position.count).fill(1.));
        geometry.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
    }
}

function handleMesh(name, material){
    return function(geometry){
        console.log(name);
        geometry.computeVertexNormals();
        var mesh = new THREE.Mesh(geometry, material);
        environment.add(mesh);
        // Find center of the geometry
        geometry.computeBoundingBox();
        var center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        mesh.updateMatrixWorld(true);

        var visibility = new Float32Array(Array(geometry.attributes.position.count).fill(1.));
        geometry.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
    }
}

function handleBasicThumbnail(camera) {
    if(params.collection && window.location !== window.parent.location) {
        var container = parent.document.getElementById('rowSlider');
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-col w3-center');
        div.setAttribute('style', 'width:150px;flex-shrink:0;');

        var img = parent.document.createElement('img');
        img.src = server + params.collection + images[camera.name];
        img.setAttribute('id', camera.name+"-slider");
        img.setAttribute('title', 'image: ' + camera.name);
        img.setAttribute('class', 'w3-opacity w3-hover-opacity-off w3-image w3-border w3-border-black w3-round w3-hover-border-blue');
        img.setAttribute('style', 'height:100px;cursor:pointer;');
        img.onclick = function () {
            setCamera(camera);
        };
        div.appendChild(img);
        container.appendChild(div);

        [].map.call(container.children, Object)
        .sort((a, b) => a.children[0].id.localeCompare(b.children[0].id))
        .forEach(elem => container.appendChild(elem));
    }
}

/* Gets ---------------------------------------------- */
function getCamera(camera, delta = 0){
    const array = cameras.children;
    const index = array.findIndex(cam => cam.name == camera.name);
    return array[(index + delta + array.length) % array.length];
}

function getMaxTextureUnitsCount(renderer) {
    const gl = renderer.getContext();
    return gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

function get2DPosition(position, camera, width, height){
    var p = position.clone();
    var vector = p.project(camera);

    vector.x = (vector.x + 1) / 2 * width;
    vector.y = -(vector.y - 1) / 2 * height;

    return new THREE.Vector2().copy(vector);
}
/* Sets ---------------------------------------------- */
function setView(camera) {
    if (!camera) return;
    console.log('View:', camera.name);
    prevCamera.set(viewCamera);
    nextCamera.set(camera);
    cameraAspect(nextCamera);
    cameraAspect(prevCamera);
    prevCamera.timestamp = 0; // timestamp will be set in the update callback
    nextCamera.zoom = viewCamera.zoom; // keep the current zoom
    nextCamera.near = 0.1;
    nextCamera.far = params.environment.radius+params.environment.epsilon;
    nextCamera.updateProjectionMatrix();
}

function setTexture(camera) {
    if (!camera) return;
    console.log('Texture:', camera.name);
    textureCamera.copy(camera);
    if(textureMaterial) {
        setMaterial(textureMaterial, camera);
        setRadius(textureMaterial, camera);
        textureMaterial.setHomography(camera);
    }
    if(multipleTextureMaterial) multipleTextureMaterial.setCamera(camera, textures);
}

function setCamera(camera) {
    setView(camera);
    setTexture(camera);
    if(window.location !== window.parent.location) {
        setThumbnail(camera.name, "-slider");
        setThumbnail(camera.name, "-cluster");
    }
}

function setMaterial(material, camera) {
    material.map =  textures[camera.name] || uvTexture;
    material.setCamera(camera, viewCamera);
}

function setRadius(material, camera){
    material.setRadius(camera);
    material.setCenter(camera);
    material.uvDistortion.R.w = params.distortion.rmax*params.distortion.rmax*material.distortion.r2img;
}

function setThumbnail(camera, type) {
    if(window.location !== window.parent.location) {
        old = parent.document.getElementsByClassName("selected"+type);
        for (i = 0; i < old.length; i++)
            old[i].className = "w3-opacity w3-hover-opacity-off w3-image w3-border w3-border-black w3-round w3-hover-border-blue";
        
        img = parent.document.getElementById(camera+type);
        if(img) img.className = "selected" + type + " w3-image w3-border w3-border-blue w3-round";
    }
}

/* Update -------------------------------------------- */
function updateEnvironment() {
    backgroundSphere.scale.set(params.environment.radius, params.environment.radius, params.environment.radius);
    backgroundSphere.position.copy(params.environment.center);
    backgroundSphere.updateWorldMatrix();

    var position = params.environment.center.clone().add(
        viewCamera.up.clone().multiplyScalar(params.environment.elevation));
    var normal = viewCamera.up.clone().multiplyScalar(-1.);
    worldPlane.position.copy(position);
    worldPlane.scale.set(params.environment.radius, params.environment.radius, 1);
    worldPlane.lookAt(position.clone().add(normal));
    worldPlane.updateWorldMatrix();

    if(controls) controls.maxDistance = params.environment.radius;
    environment.visible = true;
}

function updateMaterial(material) {
    material.setCamera(textureCamera, viewCamera);
    setRadius(material, viewCamera);
}

function updateControls() {
    var distance = new THREE.Vector3().subVectors(viewCamera.position, controls.target).length();
    // apply transformation - matrix, euler rotation, or quaternion?
    var normal = new THREE.Vector3(0,0,-1).applyQuaternion(viewCamera.quaternion);
    // instead of quaternion, you could also use .applyEuler(camera.rotation);
    // or if you used matrix, extract quaternion from matrix
    controls.target = new THREE.Vector3().add(viewCamera.position).add(normal.setLength(distance));
    //var vector = (new THREE.Vector3( 0, 0, -environmentRadius )).applyQuaternion( viewCamera.quaternion ).add( viewCamera.position );
    //controls.target.copy(vector);
    controls.saveState();
}

function updateCamera(camera) {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix(); 

    // Filter objects
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    var canvas = view.mainLoop.gfxEngine.renderer.getContext().canvas;

    // Filter objects
    var objects = cameras.children.filter(c => frustum.containsPoint(c.position.clone())).map(c => {
        var image = new Image(c); 
        image.set2DPosition(camera, canvas.width, canvas.height);
        return image;
    });

    // Cluster objects
    clusters.clusterObjects(objects);

    // Render thumbnails
    updateClusterThumbnail(clusters);
}

function updateClusterThumbnail(clusters) {
    if(params.collection && window.location !== window.parent.location) {
        // Clean (TODO: fluid interaction)
        var arr = ["leftCluster", "rightCluster", "bottomCluster", "topCluster"]; 
        arr.forEach(emptyThumbnail);
        // Create thumbnails for each cluster
        clusters.clusters.forEach(cluster => {
            // Random choose place (TODO: depend on the position of the cluster)
            var i = Math.floor(Math.random() * arr.length);
            var container = parent.document.getElementById(arr[i]); 

            var keys = Object.keys(cluster);
            if(keys.length == 1) handleOneClusterThumbnail(cluster[keys[0]].camera, container);
            else if(keys.length == 2) handleTwoClusterThumbnail(cluster[keys[0]].camera, cluster[keys[1]].camera, container, i);
            else handleMultipleClusterThumbnail(cluster, keys, container, i);
        });
    }
}

function handleMultipleClusterThumbnail(cameras, keys, container, position) {
    if(params.collection && window.location !== window.parent.location) {
        var width = position < 2 ? 'width:150px;' : 'width:185px;';
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center');
        div.setAttribute('style', width + 'flex-shrink:0;');

        var box = parent.document.createElement('div');
        box.setAttribute('class', 'w3-black w3-round w3-border w3-border-black');
        position < 2 ? box.setAttribute('style', 'display:flex;flex-direction:column;') : box.setAttribute('style', 'display:flex;height:100px;');

        var img = clusterImageThumbnail(cameras[keys[0]], 'height:96px;', 'w3-border');
        img.setAttribute('style', 'height:96px;max-width:130px;cursor:pointer;');

        var slider = parent.document.createElement('div');
        slider.setAttribute('class', 'w3-col w3-round');
        position < 2 ? slider.setAttribute('style', 'overflow-x:auto;display:flex;') : slider.setAttribute('style', 'height:96px;overflow-y:auto;display:flex;flex-direction:column;');

        var number = parent.document.createElement('div');
        number.setAttribute('class', 'w3-small w3-round w3-padding-small w3-black');
        number.innerHTML += keys.length;
        slider.appendChild(number);

        keys.forEach(key => {
            var img = clusterImageThumbnail(cameras[key], 'height:25px;', 'w3-border');
            slider.appendChild(img);
        });

        div.appendChild(box);
        box.appendChild(img);
        box.appendChild(slider);
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
        var img1 = clusterImageThumbnail(camera1, height, 'w3-border');
        var img2 = clusterImageThumbnail(camera2, height, 'w3-border');

        div.appendChild(box);
        box.appendChild(img1);
        box.appendChild(img2);
        container.appendChild(div);
    }
}

function handleOneClusterThumbnail(camera, container) {
    if(params.collection && window.location !== window.parent.location) {
        var div = parent.document.createElement('div');
        div.setAttribute('class', 'w3-padding-small w3-col w3-center');
        div.setAttribute('style', 'width:150px;flex-shrink:0;');

        var img = clusterImageThumbnail(camera, 'height:100px;', 'w3-border-large');

        div.appendChild(img);
        container.appendChild(div);
    }
};

function clusterImageThumbnail(camera, height, border) {
    var img = parent.document.createElement('img');
    img.src = server + params.collection + images[camera.name];
    img.setAttribute('id', camera.name+"-cluster");
    img.setAttribute('title', 'image: ' + camera.name);
    img.setAttribute('class', border + ' w3-image w3-border-black w3-round w3-hover-border-blue');
    img.setAttribute('style', height + 'cursor:pointer;');
    img.onclick = function () {
        setCamera(camera);
    };
    return img;
}

/* Show ---------------------------------------------- */
function showMaterials(state) {
    if (textureMaterial) textureMaterial.debug.showImage = state;
    if (multipleTextureMaterial) multipleTextureMaterial.debug.showImage = state;
}

/* Movement ------------------------------------------ */
function interpolateCamera(timestamp) {
    if (prevCamera.timestamp !== undefined) {
        if (prevCamera.timestamp == 0) {
            prevCamera.timestamp = timestamp;
            nextCamera.timestamp = prevCamera.timestamp + 1000 * params.interpolation.duration;
        }
        if (timestamp < nextCamera.timestamp) {
            const t = 0.001 * (timestamp - prevCamera.timestamp) / params.interpolation.duration;
            viewCamera.set(prevCamera).lerp(nextCamera, t);
            showMaterials(false);
        } else {
            viewCamera.setDefinetly(nextCamera);
            prevCamera.timestamp = undefined;
            nextCamera.timestamp = undefined;
            
            if(controls) controls.saveState();
            updateCamera(viewCamera);
            showMaterials(true);
        }
        viewCamera.updateProjectionMatrix(); 
    }
}

/* Clean --------------------------------------------- */
function basicClean() {
    params = {
        collection: undefined,
        cameras: {size: 10000},
        environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0},
        distortion: {rmax: 1.},
        interpolation: {duration: 3.}
    };

    const camera = new PhotogrammetricCamera();
    prevCamera.set(camera);
    nextCamera.set(camera);
    prevCamera.timestamp = undefined;
    nextCamera.timestamp = undefined;
    textureCamera.copy(viewCamera);

    viewCamera.zoom = 0.5;
    viewCamera.up.set(0, 0, 1);
    
    if(textureMaterial) textureMaterial.map = null;

    if(controls) controls.target.set(0, 0, 0);

    while(environment.children.length > 2) environment.remove(environment.children[environment.children.length - 1]);

    backgroundSphere.visible = true;
    worldPlane.visible = true;

    if(window.location !== window.parent.location) {
        var arr = ["rowSlider", "leftCluster", "rightCluster", "bottomCluster", "topCluster"]; 
        arr.forEach(emptyThumbnail);
    }

    Object.keys(textures).forEach(key => textures[key].dispose());
    Object.keys(images).forEach(key => delete images[key]);
    while(cameras.children.length) cameras.remove(cameras.children[0]);
}

function emptyThumbnail(div){
    var container = parent.document.getElementById(div);
    if(container) container.innerHTML = '';
}

