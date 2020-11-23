class Image {
    constructor(camera) {
        this.name = camera.name;
        this.camera = camera.clone();
        this.worldPos = camera.position.clone();
        this.frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4()
            .multiplyMatrices(camera.projectionMatrix.clone(), camera.matrixWorldInverse.clone()));
        this.distance = {viewpoint: Infinity};
        this.weight = {viewpoint: 0};
    }

    computeDistances(camera, frustum) {
        var p = camera.position.clone();

        // Computes the square distance
        this.distance.viewpoint = this.worldPos.distanceToSquared(p);

        // Checks if two frustum intersect

    }

    /*

    set2DPosition(camera, width, height) {
        var p = this.worldPos.clone();
        var vector = p.project(camera);

        vector.x = (vector.x + 1) / 2 * width;
        vector.y = -(vector.y - 1) / 2 * height;

        this.screenPos = new Vector2().copy(vector);
    }

    */
}

export default Image;