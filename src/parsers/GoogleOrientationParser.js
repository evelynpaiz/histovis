import * as itowns from 'itowns/dist/itowns';

function parseNumber(json, tagName){
    return parseFloat(json[tagName]);
}

function wrapTo180(angle) {
    return angle - Math.floor((angle + 180.0) / 360) * 360;
}

function parseIntrinsics(json){
    var fov = parseNumber(json, 'fov');
    var size = new itowns.THREE.Vector2(json['size'][0], json['size'][1]);
    var focal = 0.5 * size.y / Math.tan(fov * Math.PI / 360);
    var point = size.clone().multiplyScalar(0.5);
    var skew = 0;
    var distos = [];
    var near = focal*0.035/size.x; // horizontal focal length in meters, assuming a 35mm-wide sensor
    var far = 1000; // 1km

    var camera = new PhotogrammetricCamera(focal, size, point, skew, distos, near, far);
    return camera;
}

function parseExtrinsics(json){

    var M = new itowns.THREE.Matrix4();
    const degree = Math.PI / 180;

    var measurements = {
        heading: parseNumber(json, 'heading'),
        tilt: parseNumber(json, 'tilt'),
        roll: 0,
        latitude: parseNumber(json, 'lat'),
        longitude: parseNumber(json, 'lon'),
        elevation: parseNumber(json, 'elev')+3.8
    };

    var MatbB = new itowns.THREE.Matrix4();
    MatbB.set(
        0, 1, 0, 0,
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 0, 0, 1);

    // Rotation matrix of heading+tilt+roll
    var Rz = new itowns.THREE.Matrix4();
    var Ry = new itowns.THREE.Matrix4();
    var Rx = new itowns.THREE.Matrix4();
    // Rz=[cos(Y) -sin(Y) 0; sin(Y) cos(Y) 0; 0 0 1];
    Rz.makeRotationZ(measurements.heading*degree);
    // Ry=[cos(P) 0 sin(P); 0 1 0; -sin(P) 0 cos(P)];
    Ry.makeRotationY(measurements.tilt*degree);
    // Rx=[1 0 0; 0 cos(R) -sin(R); 0 sin(R) cos(R)];
    Rx.makeRotationX(measurements.roll*degree);

    Rz.multiply(Ry.multiply(Rx));

    // Computation - R is a rotation matrix whose columns are the north, east, and down axes.
    // defined conveniently from the latitude  and longitude
    // ref: https://en.wikipedia.org/wiki/Local_tangent_plane_coordinates
    var lat = measurements.latitude*degree;
    var lon = measurements.longitude*degree;
    M.set(
        -Math.sin(lat)*Math.cos(lon),   -Math.sin(lon),     -Math.cos(lat)*Math.cos(lon),   0,
        -Math.sin(lat)*Math.sin(lon),    Math.cos(lon),     -Math.cos(lat)*Math.sin(lon),   0,
        Math.cos(lat),                   0,                 -Math.sin(lat),                 0,
        0,                               0,                  0,                             1);

    M.multiply(Rz.multiply(MatbB));

    var coordinates = new itowns.Coordinates('EPSG:4326', measurements.longitude,
        measurements.latitude, measurements.elevation);

    //Geocentric coordinates
    var coord = coordinates.as('EPSG:4978');
    M.setPosition(coord.toVector3(M.position));

    return M;

    /*
    var rotation = {
        roll: 0,
        pitch: 0,
        heading: parseNumber(json, 'heading'),
        //heading: wrapTo180(-parseNumber(json, 'heading') + 180),
        toString() { return `roll: ${this.roll}, pitch: ${this.pitch}, heading: ${this.heading}`; },
    };

    var crs2crs = itowns.OrientationUtils.quaternionFromCRSToCRS('EPSG:4326', 'EPSG:4978')(coordinates);
    var attitude = itowns.OrientationUtils.quaternionFromAttitude(rotation);
    var Q = crs2crs.multiply(attitude);
    M.makeRotationFromQuaternion(Q);
    */
}

export default {

    parse: function parse(image, json) {
        var camera = parseIntrinsics(json);
        camera.matrix = parseExtrinsics(json);
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
        camera.updateMatrixWorld(true);
        camera.name = json.name;
        return camera;

        /*
        var parsedCameras = new THREE.Group();
        var obj = JSON.parse(json);
        Object.keys(obj).forEach(function(key) {
            var objJson = obj[key];
            var camera = parseIntrinsics(objJson);
            camera.matrix = parseExtrinsics(objJson);
            camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
            camera.updateMatrixWorld(true);
            camera.name = key;
            parsedCameras.add(camera);
        });
        return parsedCameras;*/
        
    },
    format: 'google/orientation',
    extensions: ['json'],
    mimetypes: ['application/json'],
    fetchtype: 'json',
};