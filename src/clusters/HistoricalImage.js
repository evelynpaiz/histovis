import { Vector3, Matrix4, Raycaster } from "three";

class HistoricalImage {
    constructor() {
        this.camera = undefined;
        this.url = undefined;
        this.ray = new Raycaster();
        this.projectedPoints = [];
        this.distance = Infinity; // distance in square value
        this.weight = 0.;
        this.visible = true;
        this.dirs = [];
    }

    setCamera(camera, geometries) {
        this.camera = camera;

        // Compute camera matrices manually
        // TODO fix bug related to inverse projection matrix
        var inverseProj = new Matrix4().getInverse(camera.projectionMatrix.clone());
        var world = camera.matrixWorld.clone();
        //Same as: new THREE.Vector3(  0,  0, -1).unproject(camera);
        var origin = camera.position.clone();

        // Target and four corners of the far plane from the camera (normalized)
        this.dirs.push(new Vector3(  0,  0,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // target
        this.dirs.push(new Vector3( -1, -1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // left bottom
        this.dirs.push(new Vector3( -1,  1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // left top
        this.dirs.push(new Vector3(  1,  1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // right top
        this.dirs.push(new Vector3(  1, -1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // right bottom

        this.updatePoints(geometries);
    }

    updatePoints(geometries) {
        if(this.camera) {
            var origin = this.camera.position.clone();

            // Picks their projected position in the world
            this.dirs.every(dir => {
                // Creates a ray with camera as origin and the specific direction
                this.ray.set(origin, dir);
                var rayIntersects = this.ray.intersectObjects(geometries, true);
                if(rayIntersects.length > 0) {
                    var firstIntersect = rayIntersects[0].point;
                    this.projectedPoints.push(firstIntersect);
                } else {
                    this.projectedPoints = [];
                    return false;
                }
            });
        }
    }

    updateDistance(projectedPoint) {
        var p;
        if(this.projectedPoints.length > 0) p = this.projectedPoints[0].clone();
        else p = new Vector3(Infinity, Infinity, Infinity);

        this.distance = p.distanceToSquared(projectedPoint.clone());
    }

    normalizeDistance(max) {
        this.weight = this.normalize(this.distance, 0, max);
    }

    normalize(val, max, min) {
        if(Math.abs(max - min) > 0.005) return Math.max(0, Math.min(1, (val - min) / (max - min)));
        else return 1;
    }
}

export default HistoricalImage;