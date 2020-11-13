
class Cluster {
    constructor() {
        this.clusters = [];
        this.threshold = 50;
    }

    clusterObjects(objects) {
        this.clusters = [];

        objects.forEach(oi => {
            var images = []; 
            var newCluster = true;
            // Check if the object already belongs to an existing cluster
            this.clusters.forEach(cluster => {
                var image = cluster[oi.name];
                if(image != undefined){
                    images = cluster;
                    newCluster = false;
                }
            });
            // All object pairs oi, oj
            objects.forEach(oj => {
                if(oi.screenPos.distanceTo(oj.screenPos) < this.threshold) { // threshold
                    images[oj.name] = oj;
                }
            });
            if(newCluster) this.clusters.push(images);
        });
    }
}

export default Cluster;