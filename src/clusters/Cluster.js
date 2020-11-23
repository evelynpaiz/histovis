// Ref: https://becominghuman.ai/hierarchical-clustering-in-javascript-brief-introduction-2f88e8601362

function BiCluster(opt) {
    this.left = opt.left || null;
    this.right = opt.right || null;
    this.object = opt.object;
    this.level = opt.level || 0;
    this.weight = opt.weight || 0.0;
}

function Cluster(id) {
    this.id = id || 0;
    this.object = [];
}

class Clustering {
    constructor() {
        this.clusters = [];
        this.images = 0;
        this.number = 0;
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
        var result = new Cluster(cluster.level);
        if(cluster.level == number) {
            var node = new Cluster(cluster.level);
            node.object = cluster.object;
            result.object = [node];
        }
        else if(cluster.level < number) result.object = cluster.object;
        else {
            if(cluster.left != null) {
                var left = this.searchTree(cluster.left, number);
                if(left.id < number) result.object = result.object.concat(left);
                else result.object = result.object.concat(left.object);
                
            }
            if(cluster.right != null) {
                var right = this.searchTree(cluster.right, number);
                if(right.id < number) result.object = result.object.concat(right);
                else result.object = result.object.concat(right.object);
            }
        }
        return result;
    }

    getClustersByNumber(number) {
        if(this.images > 0 && number > 0) {
            this.number = number;
            var total = number > this.images ? 0 : this.images - number;
            return this.searchTree(this.clusters[0], total).object;
        } 
        else {
            this.number = 0;
            return new Array();
        }
    }

    hcluster(objects) {
        this.clusters = [];
        this.images = objects.length;

        var currentclustlevel = 0;

        // Consider all data points as individual clusters
        this.clusters = objects.map(object => {
            return new BiCluster({object: object, level: 0, weight: object.weight.viewpoint})});
        
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

            // Increse the cluster level
            currentclustlevel += 1;

            var mergedObject = this.merge(this.clusters[lowestpair[0]].object, this.clusters[lowestpair[1]].object);
            var newCluster = new BiCluster({object: mergedObject, left: this.clusters[lowestpair[0]],
                right: this.clusters[lowestpair[1]], weight: biggest, level: currentclustlevel});
        
            this.clusters.splice(lowestpair[1], 1);
            this.clusters.splice(lowestpair[0], 1);
            this.clusters.push(newCluster);
        }
    }
}

export default Clustering;