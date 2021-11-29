/* ---------------------- Variables ---------------------- */
var view;
var environmentGlobe;
var buildings = [];

params.scene = {source: 1, style: 0, color: 0xeeeeee, building: 0xeeeeee};
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

    // Add color layers
    itowns.Fetcher.json('layers/Ortho.json').then(addColorLayerFromConfig);
    // Add elevation layers
    itowns.Fetcher.json('layers/WORLD_DTM.json').then(addElevationLayerFromConfig);
    itowns.Fetcher.json('layers/IGN_MNT_HIGHRES.json').then(addElevationLayerFromConfig);

    function addColorLayerFromConfig(config) {
        config.source = new itowns.WMTSSource(config.source);
        var layer = new itowns.ColorLayer(config.id, config);
        
        const vis = layer.id == 'Ortho' ? true : false;
        layer.visible = vis;
        
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
        return new itowns.THREE.Color(params.scene.building);
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
function loadJSONGlobe(material, path, file) {
    file = file || 'index-geo.json';
    loadJSON(material, path, file);
    updateEnvironmentGlobe();
}

/* Sets ---------------------------------------------- */
function setGlobeControls() {
    if (controls) controls.dispose();
    
    controls = new itowns.GlobeControls(view, itowns.CameraUtils.getTransformCameraLookingAtTarget(view, viewCamera));
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

    view.notifyChange(true);
}