import { Vector2 } from 'three';

class Image {
    constructor(camera) {
        this.name = camera.name;
        this.camera = camera.clone();
        this.worldPos = camera.position.clone();
        this.screenPos = undefined;
    }

    set2DPosition(camera, width, height) {
        var p = this.worldPos.clone();
        var vector = p.project(camera);

        vector.x = (vector.x + 1) / 2 * width;
        vector.y = -(vector.y - 1) / 2 * height;

        this.screenPos = new Vector2().copy(vector);
    }
}

export default Image;