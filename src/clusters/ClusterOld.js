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
    this.id = id || 0;
    this.object = [];
    this.position = new Vector3();
}

class Clustering {
    constructor() {
        this.tree = [];
        this.numberObjects = 0;
        this.numberClusters = 0;
    }
    
    merge(a, b) {
        return [...a, ...b];
    }

    distance(a, b) {
        return Math.pow(a - b, 2);
    }

    average(a, b, total) {
        return (a + b)/total;
    }

    averagePos(a, b, total) {
        return a.add(b).divideScalar(total);
    }

    searchTree(cluster, number) {
        var result = new Cluster(cluster.level);
        result.position = cluster.position;
        if(cluster.level == number) {
            var subCluster =  new Cluster(cluster.level);
            subCluster.position = cluster.position;
            subCluster.object = cluster.object;
            result.object = [subCluster];
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
        if(this.numberObjects > 0 && number > 0) {
            this.numberClusters = number;
            var total = number > this.numberObjects ? 0 : this.numberObjects - number;
            return this.searchTree(this.tree, total).object;
        } 
        else {
            this.numberClusters = 0;
            return new Array();
        }
    }

    // Ref: https://becominghuman.ai/hierarchical-clustering-in-javascript-brief-introduction-2f88e8601362
    hcluster(nodes) {
        this.tree = [];
        this.numberObjects = nodes.length;

        var currentclustlevel = 0;

        // Consider all data points as individual clusters
        this.tree = nodes.map(node => {
        var currentclustlevel = 1;
            return new BiCluster({object: [node], level: 0, weight: node.weight.mean,
                position: node.projectedPoints[0].clone()})
        });
    
        // Loop until the lengt of the cluster array is greater than 1
        while(this.tree.length > 1) {
            // Start with index 0 and 1
            let lowestpair = [0, 1];
            var a = this.tree[0];
            var b = this.tree[1];
            // Smallest distance between weights
            var distance = this.distance(a.weight, b.weight);
            // Weighted Average 
            var weight = this.average(a.object.length*a.weight, b.object.length*b.weight, a.object.length+b.object.length);

            for(var i=0; i<this.tree.length; i++) {
                for(var j=i+1; j<this.tree.length; j++) {
                    var a = this.tree[i];
                    var b = this.tree[j];
                    // Distance between weights
                    var d = this.distance(a.weight, b.weight);
                    // Weighted Average 
                    var w = this.average(a.object.length*a.weight, b.object.length*b.weight, a.object.length+b.object.length);

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

            a = this.tree[lowestpair[0]];
            b = this.tree[lowestpair[1]];

            var mergedObject = this.merge(a.object, b.object);
            var mergedPosition = this.averagePos(a.position.clone().multiplyScalar(a.object.length), 
                b.position.clone().multiplyScalar(b.object.length), a.object.length+b.object.length);
            var newCluster = new BiCluster({object: mergedObject, left: a, right: b, weight: weight, 
                level: currentclustlevel, worldPos: mergedPosition});
        
            this.tree.splice(lowestpair[1], 1);
            this.tree.splice(lowestpair[0], 1);
            this.tree.push(newCluster);
        }
        this.tree = this.tree.pop();
    }
}

export default Clustering;