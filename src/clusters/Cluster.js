import { Vector3 } from "three";

function BiCluster(opt) {
    this.left = opt.left || null;
    this.right = opt.right || null;
    this.object = opt.object;
    this.level = opt.level || 0;
    this.weight = opt.weight || 0.0;
    this.position = opt.position || new Vector3();
}

function Cluster(id) {
    this.id = id;
    this.object = [];
    this.weight = 0.;
    this.position = new Vector3();
}

class HierarchicalCluster {
    constructor() {
        this.tree = [];
        this.numberObjects = 0;
        this.numberClusters = 0;
    }

    distance(a, b) {
        return Math.pow(a - b, 2);
    }

    average(a, b, total) {
        return (a + b)/total;
    }

    averageVector(a, b, total) {
        return a.add(b).divideScalar(total);
    }

    merge(a, b) {
        return [...a, ...b];
    }

    // Ref: https://becominghuman.ai/hierarchical-clustering-in-javascript-brief-introduction-2f88e8601362
    hcluster(nodes) {
        this.tree = [];
        this.numberObjects = nodes.length;

        var currentclustlevel = 0;

        // Consider all data points as individual clusters
        this.tree = nodes.map(node => {
            return new BiCluster({object: [node], level: 0, weight: node.weight,
                position: node.projectedPoints["center"].clone()})
        });

        // Loop until the lengt of the cluster array is one
        while(this.tree.length > 1) {
            // Start with index 0 and 1
            let lowestpair = [0, 1];
            var o1 = this.tree[0];
            var o2 = this.tree[1];

            // Smallest distance between weights
            var distance = this.distance(o1.weight, o2.weight);
            // Weighted Average 
            var weight = this.average(o1.object.length*o1.weight, o2.object.length*o2.weight, o1.object.length+o2.object.length);

            for(var i=0; i<this.tree.length; i++) {
                for(var j=i+1; j<this.tree.length; j++) {
                    var o1 = this.tree[i];
                    var o2 = this.tree[j];
                    // Distance between weights
                    var d = this.distance(o1.weight, o2.weight);
                    // Weighted Average 
                    var w = this.average(o1.object.length*o1.weight, o2.object.length*o2.weight, o1.object.length+o2.object.length);

                    // Choose the lowest distance and store the index
                    if (d < distance){
                        distance = d;
                        weight = w;
                        lowestpair[0] =i;
                        lowestpair[1] =j;
                    }
                }
            }

            // Increse the cluster level
            currentclustlevel += 1;

            // Get the closest two objects
            o1 = this.tree[lowestpair[0]];
            o2 = this.tree[lowestpair[1]];

            // Merge both objects into one
            var mergedObject = this.merge(o1.object, o2.object);
            var mergedPosition = this.averageVector(o1.position.clone().multiplyScalar(o1.object.length), 
                o2.position.clone().multiplyScalar(o2.object.length), o1.object.length+o2.object.length);

            var newCluster = new BiCluster({object: mergedObject, left: o1, right: o2, weight: weight, 
                level: currentclustlevel, position: mergedPosition});

            // Add the new cluster
            this.tree.splice(lowestpair[1], 1);
            this.tree.splice(lowestpair[0], 1);
            this.tree.push(newCluster);
        }
    }

    getClusterByNumber(number) {
        if(this.numberObjects > 0 && number > 0) {
            this.numberClusters = number;
            var total = number > this.numberObjects ? 0 : this.numberObjects - number;
            return this.searchTree(this.tree[0], total).object;
        } 
        else {
            this.numberClusters = 0;
            return new Array();
        }
    }

    searchTree(cluster, number) {
        var result = new Cluster(cluster.level);
        result.position = cluster.position;

        if(cluster.level == number) {
            var subCluster =  new Cluster(cluster.level);
            subCluster.position = cluster.position;
            subCluster.object = cluster.object;
            result.object = [subCluster];
        } else if(cluster.level < number) result.object = cluster.object;
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
}

export default HierarchicalCluster;