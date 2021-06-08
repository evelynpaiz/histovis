/* ---------------------- Variables ---------------------- */
var server = 'https://histovis.s3.eu-west-3.amazonaws.com/';
var width, height;

var loadingScreen;

var prevCamera = new PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera();

var app, renderer, scene, cameras, controls;
var environment, backgroundSphere, worldPlane;

var composer, scenePass;
var raycaster, mouse, marker;

var basicMaterial, wireMaterial, textureMaterial, multipleTextureMaterial, viewMaterials = {}, markerMaterials = {}, spriteMaterials = {};
var textureMaterialUniforms, multipleTextureMaterialUniforms, viewMaterialUniforms, sceneMaterialUniforms, spriteMaterialUniforms, markerMaterialUniforms;

var textureLoader = new THREE.TextureLoader();
var imageLoader = new THREE.ImageLoader();

const uvTexture = textureLoader.load('data/uv.jpg');
const spriteTexture = textureLoader.load('data/sprite.png');
var textures = {}, images = {};

const lutTextures = {
    identity: {size: 2, filter: true},
    monochrome: {url: 'data/lut/monochrome-s8.png'},
    sepia: {url: 'data/lut/sepia-s8.png'},
    saturated: {url: 'data/lut/saturated-s8.png'}
};

var params = {
    collection: {name: undefined, url: undefined, overview: false},
    cameras: {size: 10000, visible: true, near: 0.1, far: 15000, zoom: 0.5, linewidth: 3},
    environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0, far: 15000},
    distortion: {rmax: 1.},
    interpolation: {duration: 3., fitCamera: false},
    load: {number: 0, done: false},
    mouse: {control: 1, timer: 0, delay: 200, prevent: false},
    markers: {scale: 4, linewidth: 3, near: true, far: true, target: false}
};

var dates = {}, names = [], markers = [];

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
        linewidth: params.cameras.linewidth,
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

function initSpriteMaterialUniforms(map, vs, fs) {
    //var uniforms = {
    //    map: map,
    //    color: 0x00ffff,
    //    vertexColors: THREE.VertexColors,
    //    fog: true,
    //    depthTest: false,
    //};

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

function initMarkerMaterialUniforms(vs, fs) {
    var uniforms = {
        color: 0x2196F3,
        linewidth: params.markers.linewidth,       // in pixels
        dashed: false,
        transparent: true,
        vertexShader: vs,
        fragmentShader: fs
    };

    return uniforms;
}

/* Lut ----------------------------------------------- */
function makeIdentityLutTexture(filter) {
    const identityLUT = new Uint8Array([
        0,   0,   0, 255,  // black
        255,   0,   0, 255,  // red
        0,   0, 255, 255,  // blue
        255,   0, 255, 255,  // magenta
        0, 255,   0, 255,  // green
        255, 255,   0, 255,  // yellow
        0, 255, 255, 255,  // cyan
        255, 255, 255, 255,  // white
    ]);

    const texture = new THREE.DataTexture(identityLUT, 4, 2, THREE.RGBAFormat);
    texture.minFilter = filter;
    texture.magFilter = filter;
    texture.needsUpdate = true;
    texture.flipY = false;
    return texture;
}

function makeLUTTexture(filter, size, url) {
    const texture = makeIdentityLutTexture(filter ? THREE.LinearFilter : THREE.NearestFilter);

    if(url) {
        const ctx = document.createElement('canvas').getContext('2d');

        imageLoader.load(url, function(image) {
            const width = size * size;
            const height = size;
            ctx.canvas.width = width;
            ctx.canvas.height = height;
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, width, height);
    
            texture.image.data = new Uint8Array(imageData.data.buffer);
            texture.image.width = width;
            texture.image.height = height;
            texture.needsUpdate = true;
        });
    }   
    return texture;
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
        //spriteMaterials[camera.name] = new THREE.SpriteMaterial(spriteMaterialUniforms.uniforms);
        //spriteMaterials[camera.name].onBeforeCompile = onBeforeCompileSprite;
        //const sprite = new THREE.Sprite(spriteMaterials[camera.name]);
        //sprite.scale.set(5, 5, 1);
        //sprite.onBeforeRender = onBeforeRenderSprite;
        //sprite.userData.originalScale = new THREE.Vector3().copy( sprite.scale ); // optional
        //group.add(sprite);

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

    group.scale.set(params.markers.scale, params.markers.scale, params.markers.scale);
    return group;

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
}

function scaleCameraHelper() {
    if(marker && markerMaterials[marker.name] && marker.scale.x < 2 + params.markers.scale){
        marker.scale.addScalar(0.5);
        spriteMaterials[marker.name].size += 2;
        markerMaterials[marker.name].linewidth += 1;
        marker.updateMatrixWorld();
        view.notifyChange(true);
        requestAnimationFrame(scaleCameraHelper);
    }
}

function downscaleCameraHelper() {
    if(marker && markerMaterials[marker.name] && marker.scale.x > params.markers.scale){
        marker.scale.addScalar(-0.5);
        spriteMaterials[marker.name].size -= 2;
        markerMaterials[marker.name].linewidth -= 1;
        marker.updateMatrixWorld();
        view.notifyChange(true);
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
    var intersects = getIntersectedObject(event);                    

    if (intersects.length > 0 && prevCamera.timestamp == undefined) {
        //Return the marker to the original state before 
        if(marker.name != "" && marker.name != intersects[0].object.parent.name) {
            marker.children[3].visible = false;
            
            var camera = getCameraByName(marker.name);

            if(camera) {
                if(!params.collection.overview) {
                    if(!marker.userData.selected) multipleTextureMaterial.removeCamera(camera);
                } else multipleTextureMaterial.setBorder(camera, {showImage: false});
            }
            downscaleCameraHelper();
        }
        else {
            marker = intersects[0].object.parent;
            if(marker.name != textureCamera.name) marker.children[3].visible = params.markers.far && true;
            scaleCameraHelper();

            var camera = getCameraByName(marker.name);

            if(camera) {
                if(!params.collection.overview) {
                    if(!marker.userData.selected) multipleTextureMaterial.setCamera(camera, {color: markerMaterials[camera.name].color});
                } else multipleTextureMaterial.setBorder(camera, {showImage: true});
            }
        }
    } else if(prevCamera.timestamp == undefined) {
        if(marker.name != "") {
            marker.children[3].visible = false;
            
            var camera = getCameraByName(marker.name);

            if(camera) {
                if(!params.collection.overview) {
                    if(!marker.userData.selected) multipleTextureMaterial.removeCamera(camera);
                } else multipleTextureMaterial.setBorder(camera, {showImage: false});
            }
        }
        downscaleCameraHelper();
    }
}

function onDocumentMouseClick(event) {
    var intersects = getIntersectedObject(event);

    if (intersects.length > 0) {
        marker = intersects[0].object.parent;
        // Select the image if it has not been projected
        var camera = getCameraByName(marker.name);   
        if(camera) {
            if(params.collection.overview) {
                var cams = [];
                collections[params.collection.name].cameras.forEach(name => {
                    const array = cameras.children;
                    const index = array.findIndex(cam => cam.name == name);
                    if(index > -1) {
                        cams.push(array[(index + array.length) % array.length]);
                    }
                });
                cleanExtent(cams);
                params.collection.overview = false;
            }

            if(!marker.userData.selected) {
                marker.userData.selected = true;
                multipleTextureMaterial.setCamera(camera, {color: markerMaterials[camera.name].color});
            } else {
                marker.userData.selected = false;
                multipleTextureMaterial.removeCamera(camera);
            }
        }
    }
}

function onDocumentMouseDblClick(event) {
    var intersects = getIntersectedObject(event);     
    
    if (intersects.length > 0) {
        marker = intersects[0].object.parent;
        var camera = getCameraByName(marker.name);   
        if(camera) {
            if(params.collection.overview) {
                var cams = [];
                collections[params.collection.name].cameras.forEach(name => {
                    const array = cameras.children;
                    const index = array.findIndex(cam => cam.name == name);
                    if(index > -1) {
                        cams.push(array[(index + array.length) % array.length]);
                    }
                });
                cleanExtent(cams);
                params.collection.overview = false;
            }

            setCamera(camera);
        }
    }
}

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

    // Camera markers except the texture camera
    var array = cameras.children.map(camera => {return camera.children[0]}); // camera helpers
    const index = array.findIndex(helper => helper.name == textureCamera.name);
    if(index > -1) array.splice(index, 1);
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

/* Loading ------------------------------------------- */
function loadOrientation(url, source, name) {
    if (!name){
        const match = url.match(/Orientation-(.*)\.[\w\d]*\.xml/i);
        name = match ? match[1] : url;
    }

    if(!names.includes(name)) names.push(name);
    const year = name.match(/[0-9]{4}/);
    if(year) dates[name] = getDate(parseInt(year[0]));

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
    images[name].url = server + params.collection.url + url;

    if(!names.includes(name)) names.push(name);
    const year = name.match(/[0-9]{4}/);
    if(year) dates[name] = getDate(parseInt(year[0]));
    
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
            if(json.camera.marker) params.markers.scale = json.camera.marker;
            if(json.camera.zoom) {
                viewCamera.zoom = json.camera.zoom;
                params.cameras.zoom = json.camera.zoom;
            }
        }

        if(json.environment) {
            if(json.environment.radius) params.environment.radius = json.environment.radius;
            if(json.environment.epsilon) params.environment.epsilon = json.environment.epsilon;
            if(json.environment.elevation) params.environment.elevation = json.environment.elevation;
            if(json.environment.far) params.environment.far = json.environment.far;
        }

        params.cameras.far = params.environment.radius + params.environment.epsilon;
        
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
        if(!getCamera(textureCamera)) setCamera(camera);
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
    
    camera.far = params.cameras.far;
    camera.near = 0.1;
    camera.setDistortionRadius();
    camera.updateProjectionMatrix();

    var helper = cameraHelper(camera);
    helper.name = camera.name;
    helper.userData.selected = false;
    camera.add(helper);

    if (typeof images[name] == "undefined") {
        images[name] = new HistoricalImage();
    } 
    images[name].setCamera(camera, [worldPlane, backgroundSphere]); 
    
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
function getCamera(camera, delta = 0, filter = true) {
    var array;
    if(filter) array = cameras.children.filter(cam => names.includes(cam.name));
    else array = cameras.children;
    const index = array.findIndex(cam => cam.name == camera.name);
    if(index > -1) return array[(index + delta + array.length) % array.length];
}

function getCameraByName(name, delta = 0, filter = true) {
    var array;
    if(filter) array = cameras.children.filter(cam => names.includes(cam.name));
    else array = cameras.children;
    const index = array.findIndex(cam => cam.name == name);
    if(index > -1) return array[(index + delta + array.length) % array.length];
}

function getMaxTextureUnitsCount(renderer) {
    const gl = renderer.getContext();
    return gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
}

function getLineGeometry(material, vertices, indices) {
    var geometry = new LineSegmentsGeometry();
    
    if(indices) {
        var g = new THREE.BufferGeometry();
        g.setIndex(indices);
        g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        var edges = new THREE.EdgesGeometry(g);
        geometry.setPositions(edges.attributes.position.array);
    } else {
        
        geometry.setPositions(vertices);
    }

    var line = new LineSegments2(geometry, material);
    line.scale.set(params.cameras.size, params.cameras.size, params.cameras.size);
    return line;
}

function getDate(year) {
    return {
        year: year,
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
    };
}

function getRandomDate(year) {
    var d = new Array();
    // Create a threshold of +-5 year to generate te dates
    const threshold = 5;
    var start = new Date(year - threshold, 0, 1);
    var end = new Date(year + threshold, 0, 1);

    // Generate the two dates 
    d.push(getRandomDate(start, end));
    d.push(getRandomDate(start, end));
    return {
        year: year,
        start: new Date(Math.min.apply(null, d)),
        end: new Date(Math.max.apply(null, d))
    };
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/* Sets ---------------------------------------------- */
function setView(camera) {
    if (!camera) return;
    if(camera.name && camera.name !== "") console.log('View:', camera.name);
    prevCamera.set(viewCamera);
    nextCamera.set(camera);
    cameraAspect(nextCamera);
    cameraAspect(prevCamera);
    prevCamera.timestamp = 0; // timestamp will be set in the update callback
    nextCamera.zoom = viewCamera.zoom; // keep the current zoom
    nextCamera.near = 0.1;
    nextCamera.far = params.environment.radius+params.environment.epsilon;
    nextCamera.updateProjectionMatrix();

    camera.visible = false;
    if(getCamera(viewCamera) && nextCamera.name !== prevCamera.name) getCamera(viewCamera).visible = true;
}

function setTexture(camera) {
    if (!camera) return;
    if(camera.name && camera.name !== "") console.log('Texture:', camera.name);
    camera.children[0].userData.selected = true;
    textureCamera.copy(camera);
    if(textureMaterial) {
        setMaterial(textureMaterial, camera);
        setRadius(textureMaterial, camera);
        textureMaterial.setHomography(camera);
    }
    if(multipleTextureMaterial) multipleTextureMaterial.setCamera(camera, {color: markerMaterials[camera.name].color});
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
        cameras.visible = false;
        if (prevCamera.timestamp == 0) {
            prevCamera.timestamp = timestamp;
            nextCamera.timestamp = prevCamera.timestamp + 1000 * params.interpolation.duration;
        }
        if (timestamp < nextCamera.timestamp) {
            const t = 0.001 * (timestamp - prevCamera.timestamp) / params.interpolation.duration;
            viewCamera.set(prevCamera).lerp(nextCamera, t);
            //showMaterials(false);
        } else {
            viewCamera.setDefinetly(nextCamera);
            prevCamera.timestamp = undefined;
            nextCamera.timestamp = undefined;
            
            cameras.visible = params.cameras.visible;
            //showMaterials(true);
        }
        viewCamera.updateProjectionMatrix(); 
    }
}

// Ref: https://discourse.threejs.org/t/camera-zoom-to-fit-object/936/24
function fitCameraToSelection(camera, set, fitOffset = 1.) {
    if(multipleTextureMaterial) {
        multipleTextureMaterial.footprint.heatmap = true;
        multipleTextureMaterial.footprint.border = 1;
    }
    // Create bounding box based on all projected points
    const box = new THREE.Box3();

    Object.values(set).forEach(item => {
        var camera = getCamera(item.camera, 0, false).clone();

        camera.far = params.environment.far;
        camera.updateProjectionMatrix();

        var proj = camera.projectionMatrix.clone();
        var world = camera.matrixWorld.clone();
        var inverseWorld = new THREE.Matrix4().getInverse(world);

        var frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(proj, inverseWorld));

        Object.values(item.projectedPoints).forEach(p => {
            
            if(frustum.containsPoint(p)) box.expandByPoint(p);


            // visible points to check the correct position
            //const geometry = new THREE.SphereBufferGeometry(10, 32, 32);
            //const material = new THREE.MeshBasicMaterial( {color: 0xff0000} );
            //const sphere = new THREE.Mesh( geometry, material );
            //sphere.position.copy(p);
            //sphere.updateMatrixWorld();
            //sphere.updateWorldMatrix();
            //view.scene.add(sphere);
        });
    });

    //view.scene.add(boxHelper(box));

    // Center and size of the bounding box
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = center.clone().sub(camera.position).normalize().multiplyScalar(distance);

    var updateCamera = camera.clone();
    updateCamera.position.copy(center).sub(direction);
    updateCamera.lookAt(center);
    updateCamera.updateProjectionMatrix();

    setView(updateCamera);
}

function boxHelper(box) {
    // Min and max size of the box
    const min = box.min;
	const max = box.max;

    const indices = new Uint16Array([ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]);
	const array = new Float32Array(8 * 3); // cube

    array[ 0 ] = max.x; array[ 1 ] = max.y; array[ 2 ] = max.z;
    array[ 3 ] = min.x; array[ 4 ] = max.y; array[ 5 ] = max.z;
    array[ 6 ] = min.x; array[ 7 ] = min.y; array[ 8 ] = max.z;
    array[ 9 ] = max.x; array[ 10 ] = min.y; array[ 11 ] = max.z;
    array[ 12 ] = max.x; array[ 13 ] = max.y; array[ 14 ] = min.z;
    array[ 15 ] = min.x; array[ 16 ] = max.y; array[ 17 ] = min.z;
    array[ 18 ] = min.x; array[ 19 ] = min.y; array[ 20 ] = min.z;
    array[ 21 ] = max.x; array[ 22 ] = min.y; array[ 23 ] = min.z;

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));

    var material = new THREE.LineBasicMaterial({color: 0xffff00, toneMapped: false});
    return new THREE.LineSegments(geometry, material);
}

/* Clean --------------------------------------------- */
function basicClean() {
    params = {
        collection: {name: undefined, url: undefined, overview: false},
        cameras: {size: 10000, visible: true, near: 0.1, far: 15000, zoom: 0.5, linewidth: 3},
        environment: {radius: 8000, epsilon: 5000, center: new THREE.Vector3(0.), elevation: 0, far: 15000},
        distortion: {rmax: 1.},
        interpolation: {duration: 3., fitCamera: false},
        load: {number: 0, done: false},
        mouse: {control: 1, timer: 0, delay: 200, prevent: false},
        markers: {scale: 4, linewidth: 3, near: true, far: true, target: false}
    };

    const camera = new PhotogrammetricCamera();
    prevCamera.set(camera);
    nextCamera.set(camera);
    prevCamera.timestamp = undefined;
    nextCamera.timestamp = undefined;
    textureCamera.copy(viewCamera);

    viewCamera.zoom = 0.4;
    viewCamera.up.set(0, 0, 1);
    
    if(textureMaterial) textureMaterial.map = null;

    if(controls && params.mouse.control == 1) controls.reset();

    while(environment.children.length > 2) environment.remove(environment.children[environment.children.length - 1]);

    backgroundSphere.visible = true;
    worldPlane.visible = true;

    Object.keys(textures).forEach(key => textures[key].dispose());
    Object.keys(images).forEach(key => delete images[key]);
    while(cameras.children.length) cameras.remove(cameras.children[0]);
    dates = {};
    names = [];

    if(multipleTextureMaterial) multipleTextureMaterial.clean();
}

function cleanExtent(cams) {
    if(multipleTextureMaterial) {
        cams.forEach(cam => multipleTextureMaterial.removeCamera(cam));
        multipleTextureMaterial.footprint.image = true;
        multipleTextureMaterial.footprint.heatmap = false;
        multipleTextureMaterial.footprint.border = 2;
    }
    
    viewCamera.zoom = params.cameras.zoom;
}