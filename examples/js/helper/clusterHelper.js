/* ---------------------- Variables ---------------------- */
params.clustering = {apply: false, images: 5, clusters: 3};

var cluster = new HierarchicalCluster();

/* ----------------------- Functions --------------------- */
function updateCluster(camera) {

    var inverseProj = new THREE.Matrix4().getInverse(camera.projectionMatrix.clone());
    var world = camera.matrixWorld.clone();

    var origin = camera.position.clone();
    var direction = new THREE.Vector3(  0,  0,  1).applyMatrix4(inverseProj).applyMatrix4(world).sub(origin).normalize();

    var ray = new THREE.Raycaster(origin, direction);
    var rayIntersects = ray.intersectObjects([worldPlane, backgroundSphere], true);

    if(rayIntersects.length > 0.) {
        var point = rayIntersects[0].point;

        // Compute distances
        Object.values(images).forEach(image => image.updateDistance(point));

        // Max of all image distances
        var maxDistanceProjection = Math.max.apply(Math, Object.values(images).map(image => image.distance));

        // Convert the distances to weights
        Object.values(images).forEach(image => image.normalizeDistance(maxDistanceProjection));

        // Rank weights in descending order
        var filtered = Object.values(images).sort((a,b) => (a.weight.mean < b.weight.mean) ? 1 : ((b.weight.mean < a.weight.mean) ? -1 : 0));
        filtered = filtered.filter((i, index) => (index < params.clustering.images));

        // Cluster objects
        cluster.hcluster(filtered);
    }
}