import * as PIXI from 'pixi/dist/pixi';

const normal = 0xffffff;
const over = 0xf44336;
const selected = 0x2196F3;

PIXI.Graphics.prototype.updateLineWidth = function(lineWidth){   
    var len = this.graphicsData.length;    
    for (var i = 0; i < len; i++) {        
        var data = this.graphicsData[i];
        data.lineWidth = lineWidth;   
        this.dirty++;        
        this.clearDirty++;    
    }    
}

class Inset {
    constructor(width, height, posX, posY, border = 3) {
        // The loader is the one in charge of loading new images
        this.loader = new PIXI.loaders.Loader();

        // Container of all images
        this.container = new PIXI.Container();
        this.container.interactive = true; // option for interaction
        this.container.buttonMode = true; // show hand cursor

        this.background = new PIXI.Graphics();

        // List of images and textures
        this.images = [];
        this.textures = [];
        this.cameras = [];

        // Aditional attributes
        this.position = {x: posX, y: posY};
        this.nextPosition = {x: posX, y: posY};
        this.size = {width: width, height: height};
        this.border = border;
        this.isSelected = false;
        this.scale = 1;

        this.timestamp = undefined;
        this.duration = 5.;

        // Event handler
        this.container
        .on('pointerover', this.pointerOverCallback(this))
        .on('pointerout', this.pointerOutCallback(this))
        .on('pointerdown', this.pointerDownCallback(this));
    }

    pointerOverCallback(inset) {
        return function() {
            if(!inset.isSelected) inset.background.tint = over;
            else inset.background.tint = selected;
            inset.scale = 1.2;
            inset.update();
        };
    }

    pointerOutCallback(inset) {
        return function() {
            if(!inset.isSelected) inset.background.tint = normal;
            else inset.background.tint = selected;
            inset.scale = 1;
            inset.update();
        };
    }

    pointerDownCallback(inset) {
        return function() {
            inset.isSelected = true;
            inset.background.tint = selected;
        };
    }

    loadImages(path, images) {
        images.forEach(image => this.loader.add(image, path+image));
        this.loader.load(this.imagesLoadedCallback(this, images));
    }

    imagesLoadedCallback(inset, images) {
        return function() {
            // Get all loaded textures
            inset.textures = images.map(image => {
                return inset.loader.resources[image].texture;
            });

            // Create the inset depending on the number of images
            if(inset.textures.length == 1) inset.oneInset(inset.textures[0]);
        };
    }

    oneInset(texture) {
        // Image
        var image = new PIXI.Sprite(texture);
        this.container.addChild(image);
        this.images.push(image);

        // Mask
        var mask = new PIXI.Graphics()
        .beginFill(normal, 1)
        .drawRoundedRect(0, 0, image.width, image.height, 5)
        .endFill();
        image.mask = mask;
        this.container.addChild(mask);

        // Border
        this.background
        .lineStyle(1, normal, 1)
        .drawRoundedRect(0, 0, image.width, image.height, 5);
        this.container.addChild(this.background);

        // Move it to the correct position
        this.updateOneInset(texture);
    }

    update(width = this.size.width, height = this.size.height) {
        this.size.width = width;
        this.size.height = height;

        if(this.textures.length == 1) this.updateOneInset(this.textures[0]);
    }

    updateOneInset(texture) {
        // Change scale 
        var max = Math.max(texture.width, texture.height);
        const scale = max == texture.width ? (this.size.width*this.scale)/max : (this.size.height*this.scale)/max;

        this.background.updateLineWidth(this.border/scale);
        this.container.scale.set(scale, scale);

        // Move it to the correct position
        var posX = this.position.x + this.size.width - (this.container.width / 2);
        var posY = this.position.y + this.size.height - (this.container.height / 2);

        this.container.position.set(posX, posY);
    }

    move(timestamp) {
        if(this.timestamp !== undefined) {
            if(this.timestamp == 0) this.timestamp = timestamp;

            var posX = this.position.x + this.size.width - (this.container.width / 2);
            var posY = this.position.y + this.size.height - (this.container.height / 2);

            if (timestamp < (this.timestamp + 1000 * this.duration)) {
                const t = 0.001 * (timestamp - this.timestamp) / this.duration;

                poxX += dt*(this.position.x - this.nextPosition.x);
                posY += dt*(this.position.y - this.nextPosition.y);
            } else {
                this.position.x = this.nextPosition.x;
                this.position.y = this.nextPosition.y;
            }
            this.container.position.set(posX, posY);
        }
    }
}

export default Inset;
    /*
    constructor(width, height, x, y) {
        this.loader = new PIXI.loaders.Loader();

        this.size = {width: width, height: height};
        this.position = {x: x, y: y};
        this.border = 3;

        // Container with all sprites
        this.object = new PIXI.Container();
        this.object.interactive = true; // option for interaction
        this.object.buttonMode = true; // show hand cursor
    }

    loadImage(image) {
        this.loader
        .add('image', image)
        .load(loadImageCallback(this));

        function loadImageCallback(inset) {
            return function() {
                var texture = inset.loader.resources.image.texture;

                var max = Math.max(texture.width, texture.height);
                const scale = max == texture.width ? inset.size.width / max : inset.size.height / max;

                // Image
                var image = new PIXI.Sprite(texture);
                inset.object.addChild(image);

                // Mask
                var mask = new PIXI.Graphics()
                .beginFill(0x709FE9, 1)
                .drawRoundedRect(0, 0, image.width, image.height, 5)
                .endFill();
                image.mask = mask;
                inset.object.addChild(mask);
                
                // Border
                var border = new PIXI.Graphics()
                .lineStyle(inset.border/scale, 0xffffff, 1)
                .drawRoundedRect(0, 0, image.width, image.height, 5);
                inset.object.addChild(border);

                // Change scale 
                inset.object.scale.set(scale, scale);

                // Move it to the correct position
                var posX = inset.position.x + inset.size.width - (inset.object.width / 2);
                var posY = inset.position.y + inset.size.height - (inset.object.height / 2);
                /*
                var posX = inset.position.x + inset.size.width - inset.object.width + inset.border;
                var posY = inset.position.y + inset.size.height - inset.object.height + inset.border;
                
                inset.object.position.set(posX, posY);
                inset.texture = texture;

                inset.object.on('pointerout', function() { 
                    updatePosition(1);
                    border.updateLineStyle(inset.border/scale, 0xffffff, 1);
                });

                inset.object.on('pointerover', function() { 
                    updatePosition(1.5);
                    border.updateLineStyle(inset.border/scale, 0xf44336, 1);
                });

                function updatePosition(s) {
                    // Change scale 
                    var max = Math.max(texture.width, texture.height);
                    const scale = max == texture.width ? (inset.size.width*s) / max : (inset.size.height*s) / max;
                    inset.object.scale.set(scale, scale);
            
                    // Move it to the correct position
                    var posX = inset.position.x + inset.size.width - (inset.object.width / 2);
                    var posY = inset.position.y + inset.size.height - (inset.object.height / 2);
            
                    inset.object.position.set(posX, posY);
                }
                

                PIXI.Graphics.prototype.updateLineStyle = function(lineWidth, color, alpha){   
                    var len = this.graphicsData.length;    
                    for (var i = 0; i < len; i++) {        
                      var data = this.graphicsData[i];
                      data.lineWidth = lineWidth;        
                      data.lineColor = color;        
                      data.alpha = alpha;   
                      this.dirty++;        
                      this.clearDirty++;    
                    }    
                }
            };
        }
    }

    updataPosition(width, height) {
        this.size.width = width;
        this.size.height = height;

        // Change scale 
        var max = Math.max(this.texture.width, this.texture.height);
        const scale = max == this.texture.width ? this.size.width / max : this.size.height / max;
        this.object.scale.set(scale, scale);

        // Move it to the correct position
        var posX = (this.size.width - this.object.width) + this.position.x + this.border;
        var posY = (this.size.height - this.object.height) + this.position.y + this.border;

        this.object.position.set(posX, posY);
    }
};

*/