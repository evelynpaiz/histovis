import { Vector2 } from "three";

class Triangle {
    constructor(v1, v2, v3) {
        this.v1 = v1.clone();
        this.v2 = v2.clone();
        this.v3 = v3.clone();
    }

    sign (p1, p2, p3) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    }

    pointInTriangle(p) {
        var d1 = this.sign(p, this.v1, this.v2);
        var d2 = this.sign(p, this.v2, this.v3);
        var d3 = this.sign(p, this.v3, this.v1);

        var neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        var pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        return !(neg && pos);
    }
}

class Line {
    constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
    }

    // Line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
    // Determine the intersection point of two line segments
    // Return FALSE if the lines don't intersect
    intersect(line) {

        const x1 = this.p1.x; const y1 = this.p1.y;
        const x2 = this.p2.x; const y2 = this.p2.y;
        const x3 = line.p1.x; const y3 = line.p1.y;
        const x4 = line.p2.x; const y4 = line.p2.y;

        // Check if none of the lines are of length 0
        if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
            return false;
        }
    
        var denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    
        // Lines are parallel
        if (denominator === 0) {
            return false;
        }
    
        let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
        let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    
        // Return a object with the x and y coordinates of the intersection
        let x = x1 + ua * (x2 - x1);
        let y = y1 + ua * (y2 - y1);
    
        return new Vector2(x, y);
    }
}

class Border {
    constructor(width, height) {
        this.size = {width: width, height: height};

        // Define the corners and center point of the canvas
        this.points = {
            topleft: new Vector2(0, 0),
            topright: new Vector2(width, 0),
            bottomleft: new Vector2(0, height),
            bottomright: new Vector2(width, height),
            center: new Vector2(width/2., height/2.)
        };

        // Create the four triangles separating each border
        this.segment = {
            left: {area: new Triangle(this.points.topleft, this.points.center, this.points.bottomleft), 
                line: new Line(this.points.topleft, this.points.bottomleft), orientation: 'left'},

            right: {area: new Triangle(this.points.topright, this.points.center, this.points.bottomright), 
                line: new Line(this.points.topright, this.points.bottomright), orientation: 'right'},

            bottom: {area: new Triangle(this.points.bottomleft, this.points.center, this.points.bottomright), 
                line: new Line(this.points.bottomleft, this.points.bottomright), orientation: 'bottom'},

            top: {area: new Triangle(this.points.topleft, this.points.center, this.points.topright), 
                line: new Line(this.points.topleft, this.points.topright), orientation: 'top'}
        };
    }

    getBorderPosition(p) {
        // Find where in the border the 
        var border = Object.values(this.segment).find(s => s.area.pointInTriangle(p));
        
        if(border) {
            var intersect = border.line.intersect(new Line(this.points.center, p));
            if(intersect) return {point: intersect, orientation: border.orientation}
            else return false;
        } else {
            return false;
        } 

    }
}

export default Border;