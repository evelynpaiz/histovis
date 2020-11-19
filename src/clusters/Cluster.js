// Ref: https://becominghuman.ai/hierarchical-clustering-in-javascript-brief-introduction-2f88e8601362

function BiCluster(opt){
    this.left = opt.left || null;
    this.right = opt.right || null;
    this.object = opt.object;
    this.id = opt.id || 0;
    this.weight = opt.weight || 0.0;
}

class Cluster {
    constructor() {
        this.clusters = [];
    }
    
    merge(a, b) {
        var checka = Array.isArray(a);
        var checkb = Array.isArray(b);
        
        if(checka && checkb) return [...a, ...b];
        else if(checka) return [...a, b];
        else if (checkb) return [a, ...b];
        else return [a, b];
    }

    distance(a, b) {
        return Math.pow(a - b, 2);
    }

    weight(a, b) {
        return (a + b)/2.;
    }

    searchTree(cluster, number) {
        var result = [];
        if(cluster.id >= 0) result = [cluster.object];
        else if(Math.abs(cluster.id) >= number) return [cluster.object];
        else {
            if(cluster.left != null) result = result.concat(this.searchTree(cluster.left, number));
            if(cluster.right != null) result = result.concat(this.searchTree(cluster.right, number));
        }
        return result;
    }

    getClustersByNumber(number) {
        return this.searchTree(this.clusters[0], number);
    }

    hcluster(objects) {
        this.clusters = [];
        var currentclustid = -objects.length;

        // Consider all data points as individual clusters
        this.clusters = objects.map((object, index) => {
            return new BiCluster({object: object, id: index, weight: object.weight.viewpoint})});
        
        // Loop until the lengt of the cluster array is greater than 1
        while(this.clusters.length > 1) {
            // Start with index 0 and 1
            let lowestpair = [0, 1];
            var closest = this.distance(this.clusters[0].weight, this.clusters[1].weight);
            var biggest = this.weight(this.clusters[0].weight, this.clusters[1].weight);

            for(var i=0; i<this.clusters.length; i++) {
                for(var j=i+1; j<this.clusters.length; j++) {
                    var d = this.distance(this.clusters[i].weight, this.clusters[j].weight);
                    var w = this.weight(this.clusters[i].weight, this.clusters[j].weight);

                    // Choose the lowest distance and store the index
                    if (d < closest){
                        closest = d;
                        biggest = w;
                        lowestpair[0] =i;
                        lowestpair[1] =j;
                    }
                }
            }

            // Decrease the cluster id
            currentclustid += 1;

            var mergedObject = this.merge(this.clusters[lowestpair[0]].object, this.clusters[lowestpair[1]].object);
            var newCluster = new BiCluster({object: mergedObject, left: this.clusters[lowestpair[0]],
                right: this.clusters[lowestpair[1]], weight: biggest, id: currentclustid});
        
            this.clusters.splice(lowestpair[1], 1);
            this.clusters.splice(lowestpair[0], 1);
            this.clusters.push(newCluster);
        }
    }
}

export default Cluster;