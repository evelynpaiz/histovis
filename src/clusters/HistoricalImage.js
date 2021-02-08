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
        var dirs = [];
        dirs.push(new Vector3(  0,  0,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // target
        dirs.push(new Vector3( -1, -1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // left bottom
        dirs.push(new Vector3( -1,  1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // left top
        dirs.push(new Vector3(  1,  1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // right top
        dirs.push(new Vector3(  1, -1,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize());  // right bottom

        // Picks their projected position in the world
        dirs.forEach(dir => {
            // Creates a ray with camera as origin and the specific direction
            this.ray.set(origin, dir);
            var rayIntersects = this.ray.intersectObjects(geometries, true);
            if(rayIntersects.length > 0) {
                var firstIntersect = rayIntersects[0].point;
                this.projectedPoints.push(firstIntersect);
            } else {
                this.projectedPoints.push(null);
            }
        });
    }

    updateDistance(projectedPoint) {
        if(this.projectedPoints[0] != null) {
            this.distance = this.projectedPoints[0].clone().distanceToSquared(projectedPoint.clone());
        }
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