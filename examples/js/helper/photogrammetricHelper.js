/* ---------------------- Variables ---------------------- */
var server = 'https://histovis.s3.eu-west-3.amazonaws.com/';
var width, height;

var prevCamera = new PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera();

var app, renderer, scene, cameras, controls;
var environment, backgroundSphere, worldPlane;

var composer, scenePass;

var mesh;

var basicMaterial, wireMaterial, textureMaterial, multipleTextureMaterial, viewMaterials = {}, markerMaterials = {};
var textureMaterialUniforms, multipleTextureMaterialUniforms, viewMaterialUniforms, sceneMaterialUniforms, markerMaterialUniforms;

var textureLoader = new THREE.TextureLoader();
const uvTexture = textureLoader.load('data/uv.jpg');
var textures = {}, images = {};

var params = {
    collection: undefined,
    cameras: {size: 10000},
    environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0},
    distortion: {rmax: 1.},
    clustering: {apply: false, images: 5, clusters: 3},
    interpolation: {duration: 3.}
};

var insets = [];
var clusters = new Clustering();

/* ----------------------- Functions --------------------- */

/* Materials ----------------------------------------- */
function initBasicMaterial(){
    return new THREE.MeshBasicMaterial({
        color: 0xf5f5f5,
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

   var material =  new MultipleOrientedImageMaterial(cameras, textures, uniforms);

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

function initMarkerMaterialUniforms() {
    var uniforms = {
        color: 0x4080ff,
        linewidth: 3,       // in pixels
        dashed: false
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

        markerMaterials[camera.name] = new LineMaterial(markerMaterialUniforms);
        markerMaterials[camera.name].resolution.set(window.innerWidth, window.innerHeight);
        //markerMaterials[camera.name].color.set(Math.random()*0xffffff);

        var edges = new THREE.EdgesGeometry(geometry);
        var lines = new LineSegmentsGeometry().setPositions(edges.attributes.position.array);

        var line = new LineSegments2(lines, markerMaterials[camera.name]);
        line.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
        group.add(line);

        /*
        var geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        var mesh = new THREE.Mesh(geometry, wireMaterial);
        mesh.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
        group.add(mesh);
        */
    }
    /*
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
    */
    // place a sphere at the camera center
    {
        var geometry = new THREE.SphereBufferGeometry(3, 8, 8);
        var mesh = new THREE.Mesh(geometry, basicMaterial);
        group.add(mesh);
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

        if(json.target) params.environment.center.copy(json.target);

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
    helper.name = camera.name;
    camera.add(helper);

    camera.updateMatrixWorld();

    cameras.add(camera);
    cameras.children.sort((a, b) => a.name.localeCompare(b.name));
}

function handleImage(name) {
    return function(texture) {
        if (!texture) return;
        texture.name = name;
        textures[texture.name] = texture;
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
    if(multipleTextureMaterial) multipleTextureMaterial.setCamera(camera);
}

function setCamera(camera) {
    setView(camera);
    setTexture(camera);
}

function setMaterial(material, camera) {
    material.map =  textures[camera.name] || uvTexture;
    material.setCamera(camera, viewCamera);
}

function setRadius(material, camera) {
    material.setRadius(camera);
    material.setCenter(camera);
    material.uvDistortion.R.w = params.distortion.rmax*params.distortion.rmax*material.distortion.r2img;
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

    environment.visible = true;
}

function updateMaterial(material) {
    material.setCamera(textureCamera, viewCamera);
    setRadius(material, viewCamera);
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
            //showMaterials(false);
        } else {
            getCamera(nextCamera).visible = false;
            if(nextCamera.name !== prevCamera.name) getCamera(prevCamera).visible = true;
            viewCamera.setDefinetly(nextCamera);
            prevCamera.timestamp = undefined;
            nextCamera.timestamp = undefined;
            
            if(controls) controls.reset(true);

            //showMaterials(true);
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
        clustering: {apply: false, images: 5, clusters: 3},
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

    if(controls) controls.reset();

    while(environment.children.length > 2) environment.remove(environment.children[environment.children.length - 1]);

    backgroundSphere.visible = true;
    worldPlane.visible = true;

    Object.keys(textures).forEach(key => textures[key].dispose());
    Object.keys(images).forEach(key => delete images[key]);
    while(cameras.children.length) cameras.remove(cameras.children[0]);

    if(multipleTextureMaterial) multipleTextureMaterial.clean();
}