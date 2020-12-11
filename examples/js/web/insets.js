/* Gets ---------------------------------------------- */
function get2DPosition(point, camera, width, height) {
    var widthHalf = width/2, heightHalf = height/2;

    var p = point.clone();
    var vector = p.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return new THREE.Vector2().copy(vector);
}

/* Update -------------------------------------------- */
function updateInsets(clusters, camera) {
    var borderWidth = (width - spriteTHREE.width) / 2.;
    var borderHeight = (height- spriteTHREE.height) / 2.;

    clusters.forEach(cluster => {
        // Compute the screen position for the cluster
        var clusterPosition = get2DPosition(cluster.position, camera, spriteTHREE.width, spriteTHREE.height);
        // Compute the four points inside the limits of the canvas 
        var positionLimit = clusterPosition.clone().max(new THREE.Vector2())
        .min(new THREE.Vector2(spriteTHREE.width, spriteTHREE.height)); 

        if(cluster.object.length == 1) {
            var cam = cluster.object[0].camera;
            // Check if the inset already exists
            const index = insets.filter(inset => inset.cameras.length == 1).findIndex(inset => cam.name == inset.cameras[0]);
            if(index >= 0) {
                var inset = insets[index];
                inset.nextPosition.x = positionLimit.x;
                inset.nextPosition.y = positionLimit.y;
                inset.timestamp = 0;
            } else {
                // Link to the image
                var path = images[cam.name] ? server + params.collection : '';
                var src = images[cam.name] ? images[cam.name] : 'data/uv.jpg';
                var inset = new Inset(borderWidth, borderHeight, positionLimit.x, positionLimit.y);
                inset.loadImages(path, [src], [cam]);
                inset.cameras.push(cam.name);
                app.stage.addChild(inset.container);
                insets.push(inset);
                        
                inset.container.on('pointerdown', function() {
                    inset.isSelected = true;
                    inset.background.tint = 0x2196F3;
                    setCamera(cam);
                });
            } 
        }
    });
    //array.forEach(inset => inset.container.destroy());
    //array = [];
}