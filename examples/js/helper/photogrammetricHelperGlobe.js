/* ---------------------- Variables ---------------------- */
var view;
var environmentGlobe;
var buildings = [];

var globeRendering = true;

/* ----------------------- Functions --------------------- */

/* Environment --------------------------------------- */
function initGlobe(container, camera) {
    var initialPos = { longitude: 2.351323, latitude: 48.856712, altitude: 10000000 };
    
    var placement = {
        coord: new itowns.Coordinates('EPSG:4326',  initialPos.longitude , initialPos.latitude),
        range: initialPos.altitude
    };

    view = new itowns.GlobeView(container, placement, 
        {handleCollision: false, disableSkirt: false, noControls: true, camera: camera});
    camera.zoom = params.cameras.zoom;

    // Controls
    //controls = new itowns.GlobeControls(view, placement);
    controls = new itowns.FirstPersonControls(view);

    // Add color layers
    itowns.Fetcher.json('layers/Ortho.json').then(addColorLayerFromConfig);
    // Add elevation layers
    itowns.Fetcher.json('layers/WORLD_DTM.json').then(addElevationLayerFromConfig);
    itowns.Fetcher.json('layers/IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);

    function addColorLayerFromConfig(config) {
        config.source = new itowns.WMTSSource(config.source);
        var layer = new itowns.ColorLayer(config.id, config);
        view.addLayer(layer);
    }

    function addElevationLayerFromConfig(config) {
        config.source = new itowns.WMTSSource(config.source);
        var layer = new itowns.ElevationLayer(config.id, config);
        view.addLayer(layer);
    }
}

function initBuildings(material) {  
    var color = new THREE.Color();
    var tile;

    scaler = function update(/* dt */) {
        var i;
        var building;
        if (buildings.length) {
            view.notifyChange(view.camera.camera3D, true);
        }
        for (i = 0; i < buildings.length; i++) {
            building = buildings[i];
            if (building) {
                building.scale.z = Math.min(
                    1.0, building.scale.z + 0.1);
                building.updateMatrixWorld(true);
            }
        }
        buildings = buildings.filter(function filter(m) { return m.scale.z < 1; });
    };

    view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, scaler);

    var wfsBuildingSource = new itowns.WFSSource({
        url: 'https://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wfs?',
        version: '2.0.0',
        typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
        projection: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        zoom: { min: 15, max: 15 },
    });

    var wfsBuildingLayer = new itowns.GeometryLayer('building', new THREE.Group(), {
        transparent: true,
        update: itowns.FeatureProcessing.update,
        convert: itowns.Feature2Mesh.convert({
            color: colorBuildings,
            batchId: function (property, featureId) { return featureId; },
            altitude: altitudeBuildings,
            extrude: extrudeBuildings
        }),
        onMeshCreated: function modifyBuilding(building) {
            var geometry = building.geometry;
            var visibility = new Float32Array(Array(geometry.attributes.position.count).fill(1.));
            geometry.setAttribute('visibility', new THREE.BufferAttribute(visibility, 1));

            building.scale.z = 0.01;
            building.material = material;

            buildings.push(building);
        },
        filter: acceptFeature,
        overrideAltitudeInToZero: true,
        source: wfsBuildingSource
    });
    // Change opacity so the layer mantains the material transparent
    wfsBuildingLayer.opacity = 0.99;

    view.addLayer(wfsBuildingLayer);

    /* Environment Management ---------------------------- */
    function colorBuildings(properties) {
        //if (properties.id.indexOf('bati_remarquable') === 0) {
        //    return color.set(0x5555ff);
        //} else if (properties.id.indexOf('bati_industriel') === 0) {
        //    return color.set(0xff5555);
        //}
        return color.set(0xeeeeee);
        //return color.set(0xe91e63);
    }

    function altitudeBuildings(properties) {
        return properties.z_min - properties.hauteur;
    }

    function extrudeBuildings(properties) {
        return properties.hauteur;
    }

    function acceptFeature(properties) {
        return !!properties.hauteur;
    }
}

/* Loading ------------------------------------------- */
function loadJSONGlobe(material, path, file, c) {
    file = file || 'index-geo.json';
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
            if(json.camera.far) params.cameras.far = json.camera.far;
            else params.cameras.far = params.environment.radius+params.environment.epsilon;
        }

        if(json.environment) {
            if(json.environment.radius) params.environment.radius = json.environment.radius;
            if(json.environment.epsilon) params.environment.epsilon = json.environment.epsilon;
            if(json.environment.elevation) params.environment.elevation = json.environment.elevation;
        }
        
        if(json.up) viewCamera.up.copy(json.up);
        if(json.pointSize) material.size = json.pointSize;

        updateEnvironmentGlobe();

        if(json.ori && json.img) {
            params.load.number = json.img.length;
            json.ori.forEach((orientationUrl, i) => {
                if(c && collections[c].cameras) {
                    const match = orientationUrl.match(/Orientation-(.*)\.[\w\d]*\.xml/i);
                    var name = match ? match[1] : url;
                    collections[c].cameras.push(name);
                }
                loadOrientedImage(orientationUrl, json.img[i], source);
            });
        }

        if(json.groupimg) {
            params.load.number = json.groupimg.length;
            Object.keys(json.groupimg).forEach((image) => {
                if(c && collections[c].cameras) {
                    collections[c].cameras.push(image);
                }
                loadOrientedImageGroup(json.groupimg[image], 'img/'+image+'.jpg', source, image);
            });
        }

        //setCamera(getCamera(viewCamera));
    });
}

function unloadJSONGlobe(c) {
    if(collections[c] && collections[c].cameras) {
        collections[c].cameras.forEach(name => {
            const nidex = names.findIndex(n => n == name);
            if(nidex > -1) delete names[nidex];

            const array = cameras.children;
            const index = array.findIndex(cam => cam.name == name);
            if(index > -1) {
                var camera = array[(index + array.length) % array.length];
                if(camera.name == textureCamera.name) {
                    const camera = new PhotogrammetricCamera();
                    prevCamera.set(camera);
                    nextCamera.set(camera);
                    prevCamera.timestamp = undefined;
                    nextCamera.timestamp = undefined;
                    textureCamera.copy(camera);
                }
                multipleTextureMaterial.removeCamera(camera);
                delete textures[name];
                delete images[name];
                delete dates[name];
                cameras.remove(camera);
            }
        });
        collections[c].cameras = [];
    }
}

/* Update -------------------------------------------- */
function updateEnvironmentGlobe() {
    var cord =  new itowns.Coordinates('EPSG:4978', params.environment.center.x, 
    params.environment.center.y, params.environment.center.z + params.environment.elevation);

    backgroundSphere.scale.set(params.environment.radius, params.environment.radius, params.environment.radius);
    backgroundSphere.position.copy(cord.as(view.referenceCrs));
    backgroundSphere.updateWorldMatrix();

    worldPlane.position.copy(cord.as(view.referenceCrs));
    worldPlane.scale.set(params.environment.radius, params.environment.radius, 1);
    worldPlane.lookAt(worldPlane.position.clone().add(cord.geodesicNormal));
    worldPlane.updateWorldMatrix();

    environment.visible = true;
}

/* Movement ------------------------------------------ */
function interpolateCameraGlobe(timestamp) {
    if (prevCamera.timestamp !== undefined) {
        view.notifyChange(view.camera.camera3D, true);
        if (timestamp > nextCamera.timestamp) {
            var coord = new itowns.Coordinates('EPSG:4978', viewCamera.position.x, viewCamera.position.y, viewCamera.position.z);
            viewCamera.up.copy(coord.geodesicNormal);
        }
    }
    interpolateCamera(timestamp);
    
}