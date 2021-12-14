/* ---------------------- Variables ---------------------- */
var server = 'https://histovis.s3.eu-west-3.amazonaws.com/';
var width, height;

var prevCamera = new PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera();

var renderer, scene, cameras, controls;
var environment, backgroundSphere, worldPlane;

var basicMaterial, wireMaterial, textureMaterial, multipleTextureMaterial, viewMaterials = {}, markerMaterials = {}, spriteMaterials = {};
var textureMaterialUniforms, multipleTextureMaterialUniforms, viewMaterialUniforms, markerMaterialUniforms, spriteMaterialUniforms;

var textureLoader = new THREE.TextureLoader();
const uvTexture = textureLoader.load('data/uv.jpg');
const spriteTexture = textureLoader.load('data/sprite.png');

const whiteData = new Uint8Array(3);
whiteData.set([255, 255, 255]);
whiteTexture = new THREE.DataTexture(whiteData, 1, 1, THREE.RGBFormat);
whiteTexture.name = 'white';

var textures = {}, images = {};

var params = {
    collection: {name: undefined, url: undefined},
    cameras: {size: 10000, zoom: 0.5},
    environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0, far: 15000},
    distortion: {rmax: 1},
    interpolation: {duration: 3.},
    load: {number: 0},
    bookmark: {type: 0, linewidth: 3, style: 1},
    footprint: {color: new THREE.Color(0x000000).getHex(), linewidth: 3},
    mouse: {timer: 0, delay: 200, prevent: false}
};

var clock = new THREE.Clock();

var raycaster, mouse, marker;

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
        depthMap: whiteTexture,
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
        depthMap: whiteTexture,
        size: 2,
        linewidth: params.footprint.linewidth,
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
        side: THREE.DoubleSide,
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

function initMarkerMaterialUniforms(vs, fs) {
    var uniforms = {
        color: 0x2196F3,
        linewidth: params.bookmark.linewidth, // in pixels
        dashed: false,
        transparent: true,
        vertexShader: vs,
        fragmentShader: fs
    };

    return uniforms;
}

function initSpriteMaterialUniforms(map, vs, fs) {
    var uniforms = { 
        map: map, 
        color: 0x00ffff,
        size: 30, 
        sizeAttenuation: false, 
        alphaTest: 0.5, 
        transparent: true 
    };

    return {uniforms: uniforms, thickness: 30., vertexShader: vs, fragmentShader: fs};
}

/* Environment --------------------------------------- */
function initBackgroundSphere(material) {
    var sphere = new THREE.SphereBufferGeometry(-1, 32, 32);
    var visibility = new Float32Array(sphere.attributes.position.count); // invisible
    sphere.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
    return new THREE.Mesh(sphere, material);
}

function initWorldPlane(material) {
    var plane = new THREE.PlaneBufferGeometry(-1, -1, 15, 15);
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
        var visibility = new Float32Array(Array(geometry.attributes.position.count).fill(0.));
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

    return group;
}

function cameraHelperBookmark(camera) {
    var group = new THREE.Group();

    markerMaterials[camera.name] = new LineMaterial(markerMaterialUniforms);
    markerMaterials[camera.name].resolution.set(window.innerWidth, window.innerHeight);

    m = new THREE.Matrix4().getInverse(camera.projectionMatrix);
    var v = new Float32Array(30);

    // target point
    new THREE.Vector3(  0, 0,  1 ).applyMatrix4(m).toArray(v, 3);

    // get the 4 corners on the near and far plane (neglecting distortion)
    new THREE.Vector3( -1, -1, -1 ).applyMatrix4(m).toArray(v,  6);
    new THREE.Vector3( -1,  1, -1 ).applyMatrix4(m).toArray(v,  9);
    new THREE.Vector3(  1,  1, -1 ).applyMatrix4(m).toArray(v, 12);
    new THREE.Vector3(  1, -1, -1 ).applyMatrix4(m).toArray(v, 15);

    new THREE.Vector3( -1, -1,  1 ).applyMatrix4(m).toArray(v, 18); 
    new THREE.Vector3( -1,  1,  1 ).applyMatrix4(m).toArray(v, 21); 
    new THREE.Vector3(  1,  1,  1 ).applyMatrix4(m).toArray(v, 24); 
    new THREE.Vector3(  1, -1,  1 ).applyMatrix4(m).toArray(v, 27); 

    // place a sprite at the center point
    {
        var vertices = v.slice(0, 3);
        var geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        spriteMaterials[camera.name] = new THREE.PointsMaterial(spriteMaterialUniforms.uniforms);

        const sprite = new THREE.Points(geometry, spriteMaterials[camera.name]);
        group.add(sprite);
    }

    // place a target line point
    {
        var vertices = v.slice(0, 6);
        var geometry = getLineGeometry(markerMaterials[camera.name], vertices);
        geometry.visible = false;
        group.add(geometry);
    }

    // place a near plane frustum
    {
        var vertices = v;
        var indices = [0, 2, 3,  0, 3, 4,  0, 4, 5,  0, 5, 2];
        var geometry = getLineGeometry(markerMaterials[camera.name], vertices, indices);
        group.add(geometry);
    }

    // place a far plane frustum    
    {
        var vertices = v;
        var indices = [0, 6, 7,  0, 7, 8,  0, 8, 9,  0, 9, 6];
        var geometry = getLineGeometry(markerMaterials[camera.name], vertices, indices);
        geometry.visible = false;
        group.add(geometry);
    }

    // place the image plane with an image
    {
        viewMaterials[camera.name] = new OrientedImageMaterial(viewMaterialUniforms);
        setMaterial(viewMaterials[camera.name], camera);
        viewMaterials[camera.name].debug.showImage = true;

        var vertices = v.slice(6, 18);
        var uvs = new Float32Array([ 0., 0.,  0., 1.,  1., 1.,  1., 0.]);
        var visibility = new Float32Array(Array(12).fill(0.));
        var indices = [0, 2, 1,  0, 3, 2];

       var geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));
        var mesh = new THREE.Mesh(geometry, viewMaterials[camera.name]);
        mesh.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
        group.add(mesh);
    }

    function onBeforeCompileSprite(shader) {
        shader.uniforms.outlineThickness = {value: spriteMaterialUniforms.thickness};
        shader.uniforms.resolution = {value: new THREE.Vector2(width, height)};

        shader.vertexShader = spriteMaterialUniforms.vertexShader;
        shader.fragmentShader = spriteMaterialUniforms.fragmentShader;
    }

    function onBeforeRenderSprite() {
        var v = new THREE.Vector3();
        var v1 = new THREE.Vector3();

        return function onBeforeRender( renderer, scene, camera ) {
            var factor = 0.05; // optional

            v.setFromMatrixPosition( this.matrixWorld );
            v1.setFromMatrixPosition( camera.matrixWorld );

            var f = v.sub( v1 ).length() * factor;
            this.scale.x = this.userData.originalScale.x * f;
            this.scale.y = this.userData.originalScale.y * f;
        }
    }

    return group;
}

function scaleCameraHelper() {
    if(marker && markerMaterials[marker.name] && marker.scale.x < 2){
        marker.scale.addScalar(0.5);
        spriteMaterials[marker.name].size += 2;
        markerMaterials[marker.name].linewidth += 1;
        marker.updateMatrixWorld();
        requestAnimationFrame(scaleCameraHelper);
    }
}

function downscaleCameraHelper() {
    if(marker && markerMaterials[marker.name] && marker.scale.x > 1){
        marker.scale.addScalar(-0.5);
        spriteMaterials[marker.name].size -= 2;
        markerMaterials[marker.name].linewidth -= 1;
        marker.updateMatrixWorld();
        requestAnimationFrame(downscaleCameraHelper);
    } else marker = new THREE.Group();
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

function onDocumentMouseMove(event) {
    if (prevCamera.timestamp == undefined) {

        var intersects = getIntersectedObject(event); 

        if(intersects.length > 0){
            if(marker.name != "" && marker.name != intersects[0].object.parent.name) {
                marker.children[3].visible = false;
                downscaleCameraHelper();
            }else{
                marker = intersects[0].object.parent;

                if(marker.name != textureCamera.name) {
                    marker.children[3].visible = params.bookmark.style == 2;
                    scaleCameraHelper();

                    var camera = getCameraByName(marker.name);
                    if(camera) setTexture(camera);
                }
            }
        }else if(marker.name != "") {
            marker.children[3].visible = false;
            downscaleCameraHelper();
        }
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

    // Save the url of the image
    if (typeof images[name] == "undefined") {
        images[name] = new HistoricalImage();
    } 
    images[name].url = server + params.collection.url + url || 'data/uv.jpg';

    return source.open(url, 'dataURL')
    .then(parseImage(source))
    .then(handleImage(name));
}

function loadOrientedImage(orientationUrl, imageUrl, source, name) {
    loadImage(imageUrl, source).then(() => loadOrientation(orientationUrl, source, name));
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

function loadJSON(material, envFunction, path, file) {
    file = file || 'index.json';
    var source = new FetchSource(path);
    source.open(file, 'text').then((json) => {
        json = JSON.parse(json);

        if(json.target) {
            params.environment.center.copy(json.target);
            if(controls && controls.target) controls.target.copy(json.target);
        } 

        if(json.camera) {
            if(json.camera.scale) params.cameras.size = json.camera.scale;
            if(json.camera.zoom) {
                viewCamera.zoom = json.camera.zoom;
                params.cameras.zoom = json.camera.zoom;
            }
        }

        if(json.environment) {
            if(json.environment.radius) params.environment.radius = json.environment.radius;
            if(json.environment.epsilon) params.environment.epsilon = json.environment.epsilon;
            if(json.environment.elevation) params.environment.elevation = json.environment.elevation;
        }
        
        if(json.up) viewCamera.up.copy(json.up);
        if(json.pointSize) material.size = json.pointSize;

        envFunction();
        
        if(json.pc) json.pc.forEach((url) => loadPlyPC(url, source, material));
        if(json.mesh) json.mesh.forEach((url) => loadPlyMesh(url, source, material));

        if(json.ori && json.img) {
            params.load.number += json.img.length;
            json.ori.forEach((orientationUrl, i) => 
            loadOrientedImage(orientationUrl, json.img[i], source));
        }
    });
}

/* Parsing ------------------------------------------- */
function parseOrientation(source) {
    var parsers = [MicmacOrientationParser, MatisOrientationParser];
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
    
    camera.near = 0.1;
    camera.far = params.environment.radius+params.environment.epsilon;
    camera.setDistortionRadius();
    camera.updateProjectionMatrix();

    // Camera helper
    var helper = params.bookmark.type == 0 ? cameraHelper(camera) : cameraHelperBookmark(camera);
    helper.name = camera.name;
    camera.add(helper);
    camera.updateMatrixWorld();

    if (typeof images[name] == "undefined") {
        images[name] = new HistoricalImage();
    } 
    images[name].setCamera(camera, [worldPlane, backgroundSphere]); 

    // Camera renderer target
    var target = getRenderTarget();
    camera.renderTarget = target;

    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    
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

/* Gets ---------------------------------------------- */
function getCamera(camera, delta = 0){
    const array = cameras.children;
    const index = array.findIndex(cam => cam.name == camera.name);
    if(index > -1) return array[(index + delta + array.length) % array.length];
}

function getCameraByName(name, delta = 0, filter = true) {
    const array = cameras.children;
    const index = array.findIndex(cam => cam.name == name);
    if(index > -1) return array[(index + delta + array.length) % array.length];
}

function getMaxTextureUnitsCount(renderer) {
    const gl = renderer.getContext();
    return gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

function getRenderTarget() {
    var target = new THREE.WebGLRenderTarget(1024, 1024); // (window.innerWidth, window.innerHeight);
    target.texture.format = THREE.RGBFormat;
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.texture.generateMipmaps = false;
    target.stencilBuffer = false;
    target.depthBuffer = true;
    target.depthTexture = new THREE.DepthTexture();
    target.depthTexture.format = THREE.DepthFormat;
    target.depthTexture.type = THREE.UnsignedIntType;

    return target;
}

function getLineGeometry(material, vertices, indices) {
    var geometry = new LineSegmentsGeometry();
    
    if(indices) {
        var g = new THREE.BufferGeometry();
        g.setIndex(indices);
        g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        var edges = new THREE.EdgesGeometry(g);
        geometry.setPositions(edges.attributes.position.array);
    } else geometry.setPositions(vertices);

    var line = new LineSegments2(geometry, material);
    line.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
    return line;
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
    if(camera.renderTarget) material.depthMap = camera.renderTarget.depthTexture || whiteTexture;
    material.setCamera(camera, viewCamera);
}

function setRadius(material, camera){
    material.setRadius(camera);
    material.setCenter(camera);
    material.uvDistortion.R.w = params.distortion.rmax*params.distortion.rmax*material.distortion.r2img;
}

function setBasicControls() {
    if (controls) controls.dispose();
    
    controls = new MapControls(viewCamera, renderer.domElement);
    controls.enableDamping = false;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = 0.75*Math.PI;
    controls.enableKeys = false;

    controls.target.copy(params.environment.center);
}

/* Update -------------------------------------------- */
function updateEnvironment() {
    if(backgroundSphere) {
        backgroundSphere.scale.set(params.environment.radius, params.environment.radius, params.environment.radius);
        backgroundSphere.position.copy(params.environment.center);
        backgroundSphere.updateWorldMatrix();
    }
    
    if(worldPlane) {
        var position = params.environment.center.clone().add(
            viewCamera.up.clone().multiplyScalar(params.environment.elevation));
        var normal = viewCamera.up.clone().multiplyScalar(-1.);
        worldPlane.position.copy(position);
        worldPlane.scale.set(params.environment.radius, params.environment.radius, 1);
        worldPlane.lookAt(position.clone().add(normal));
        worldPlane.updateWorldMatrix();
    }
    
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

            if(controls && controls.target) controls.saveState();
            showMaterials(true);
        }
        viewCamera.updateProjectionMatrix(); 
    }
};

/* Mouse --------------------------------------------- */
function saveMouseCoords(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1;
    mouse.y = - (( event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
}

function getIntersectedObject(event) {
    // calculate mouse position
    saveMouseCoords(event);

    if(!cameras.visible) return [];

    // Camera markers except the texture camera
    var array = cameras.children.map(camera => {return camera.children[0]}); // camera helpers
    //const index = array.findIndex(helper => helper.name == textureCamera.name);
    //if(index > -1) array.splice(index, 1);
    array = array.map(helper => {return helper.children[0]}); // center point of the pyramid

    // Equal to:
    //var direction = new THREE.vector3(mouse.x, mouse.y, 0.5).unproject(viewCamera).sub(origin).normalize();
    //this.applyMatrix4( camera.projectionMatrixInverse ).applyMatrix4( camera.matrixWorld );
    var inverseProj = new THREE.Matrix4().getInverse(viewCamera.projectionMatrix);
    var world = viewCamera.matrixWorld.clone();

    var origin = viewCamera.position.clone();
    var direction = new THREE.Vector3(mouse.x, mouse.y, 0.5).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize();

    raycaster.set(origin, direction);

    return raycaster.intersectObjects(array, true);
};

/* Clean --------------------------------------------- */
function basicClean() {
    params = {
        collection: {name: undefined, url: undefined},
        cameras: {size: 10000, zoom: 0.5},
        environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0, far: 15000},
        distortion: {rmax: 1},
        interpolation: {duration: 3.},
        load: {number: 0},
        bookmark: {type: 0, linewidth: 3, style: 1},
        footprint: {color: new THREE.Color(0x000000).getHex(), linewidth: 3},
        mouse: {timer: 0, delay: 200, prevent: false}
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

    if(controls && controls.target) controls.target.set(0, 0, 0);

    while(environment.children.length > 2) environment.remove(environment.children[environment.children.length - 1]);

    if(backgroundSphere) backgroundSphere.visible = true;
    if(worldPlane) worldPlane.visible = true;

    Object.keys(textures).forEach(key => textures[key].dispose());
    Object.keys(images).forEach(key => delete images[key]);
    
    while(cameras.children.length) cameras.remove(cameras.children[0]);

    if(multipleTextureMaterial) multipleTextureMaterial.clean();
}