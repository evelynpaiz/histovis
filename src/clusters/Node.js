import numeric from 'numeric';

class Node {
    constructor(camera, geometries) {
        this.camera = camera.clone();

        // Creates the frustum of the camera to the infinity
        this.frustum = new THREE.Frustum();
        this.frustum.setFromProjectionMatrix(new THREE.Matrix4()
            .multiplyMatrices(camera.projectionMatrix.clone(), camera.matrixWorldInverse.clone()));

        // Center and four corners of the far plane from the camera (normalized)
        var dirs = [];
        var center = new THREE.Vector3(  0,  0, -1).unproject(camera);
        dirs.push(new THREE.Vector3(  0,  0,  1).unproject(camera).sub(center).normalize());  // target
        dirs.push(new THREE.Vector3( -1, -1,  1).unproject(camera).sub(center).normalize());  // left bottom
        dirs.push(new THREE.Vector3( -1,  1,  1).unproject(camera).sub(center).normalize());  // left top
        dirs.push(new THREE.Vector3(  1,  1,  1).unproject(camera).sub(center).normalize());  // right top
        dirs.push(new THREE.Vector3(  1, -1,  1).unproject(camera).sub(center).normalize());  // right bottom

        var ray = new THREE.Raycaster();
        this.projectedPoints = [];

        // Picks their projected position in the world
        dirs.forEach(dir => {
            // Creates a ray with camera as origin and the specific direction
            ray.set(camera.position.clone(), dir);
            var rayIntersects = ray.intersectObjects(geometries, true);
            var firstIntersect = rayIntersects[0].point || null;
            this.projectedPoints.push(firstIntersect);
        });

        this.distance = {viewpoint: Infinity, projection: Infinity, intersect: false}; // distance in square value
        this.weight = {mean: 0, viewpoint: 0, projection: 0, intersect: 0};
    }

    computeDistances(camera, frustum, point) {
        // Computes the square distances
        this.distance.viewpoint = this.camera.position.clone().distanceToSquared(camera.position.clone());
        this.distance.projection = this.projectedPoints[0].clone().distanceToSquared(point.clone());

        // Check if the frustum contains at least one of the projected points
        const box = new THREE.Box3().setFromPoints(this.projectedPoints);
        this.distance.intersect = frustum.intersectsBox(box);

        /*
        // Checks if two frustum intersect
        // Ref: https://mathworld.wolfram.com/Plane-PlaneIntersection.html
        // Ref: https://mathworld.wolfram.com/HessianNormalForm.html
        // Ref https://mathworld.wolfram.com/ParallelPlanes.html

        this.distance.intersect = false;

        frustum.planes.forEach(p1 => {
            this.frustum.planes.forEach(p2 => {
                var n1 = [p1.normal.x, p1.normal.y, p1.normal.z];
                var n2 = [p2.normal.x, p2.normal.y, p2.normal.z];
                var parallel = Math.abs(numeric.dot(n1, n2));

                // Two planes specified in Hessian normal form are parallel
                if(parallel == 1) this.distance.intersect = this.distance.intersect || false;
                else {
                    var matA = [n1, n2];
                    var matB = [-p1.constant, -p2.constant];
                    try{
                        var matC = numeric.inv(numeric.dotMMsmall(numeric.transpose(matA), matA));
                        var matD = numeric.dotMMsmall(matC, numeric.transpose(matA));
                        var matX = numeric.dotMV(matD, matB);
                        if(Math.abs(matX[0] > 100) && Math.abs(matX[1] > 100) && Math.abs(matX[2] > 100)) 
                            this.distance.intersect = this.distance.intersect || true;
                    }catch(e){
                        this.distance.intersect = this.distance.intersect || false;
                    }   
                }
            });
        });
        */
    }

    normalizeDistances(maxView, maxProj) {
        this.weight.viewpoint = this.normalize(this.distance.viewpoint, 0, maxView);
        this.weight.projection = this.normalize(this.distance.projection, 0, maxProj);
        this.weight.intersect = this.distance.intersect ? 1 : 0;

        this.weight.mean = (this.weight.viewpoint + this.weight.projection + this.weight.intersect) / 3;
    }

    normalize(val, max, min) {
        if(Math.abs(max - min) > 0.005) return Math.max(0, Math.min(1, (val - min) / (max - min)));
        else return 1;
    }
}

export default Node;