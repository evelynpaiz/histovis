var vis = {sidebar: true, type: 0};

const frame = document.getElementById("myRenderer");
var slider = document.getElementById("mySlider");
var cluster = document.getElementById("myCluster");

frame.addEventListener("load", function() {
    var collections = frame.contentWindow.collections;
    for(const key in collections){
        var value = collections[key];
        createCollectionElement(key, value);
    } 
});

document.addEventListener('keydown', e => {
    frame.contentDocument.dispatchEvent(new KeyboardEvent('keydown', {key: e.key}));
});

document.addEventListener('resize', e => {
    frame.contentDocument.dispatchEvent(new Event('resize'));
});

function createCollectionElement(key, value) {
    var element = document.createElement('a');
    element.setAttribute('class', 'w3-bar-item w3-button');
    element.appendChild(document.createTextNode(key));
    element.onclick = value;
    document.getElementById('myCollections').appendChild(element);
}

function myCollectionsFunc() {
    var x = document.getElementById('myCollections');
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
    } else { 
        x.className = x.className.replace(" w3-show", "");
        x.previousElementSibling.className = 
        x.previousElementSibling.className.replace(" w3-green", "");
    }
}

function myMenuFunc() {
    var x = document.getElementById('myMenu');
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
        x.previousElementSibling.className += " w3-green";
    } else { 
        x.className = x.className.replace(" w3-show", "");
        x.previousElementSibling.className = 
        x.previousElementSibling.className.replace(" w3-green", "");
    }
}

function openMenu() {
    document.getElementById('mySidebar').style.display = 'block';
    vis.sidebar = true;

    if(vis.type == 2) { // cluster visualization
        frame.style.marginLeft = '370px';
        frame.style.width = 'calc(100% - 540px)';
    } else {
        frame.style.marginLeft = '210px';
        frame.style.width = 'calc(100% - 220px)';
    }

    slider.style.marginLeft = '210px';
    slider.style.width = 'calc(100% - 220px)';

    cluster.style.marginLeft = '210px';
    cluster.style.width = 'calc(100% - 220px)';
}

function closeMenu() {
    document.getElementById('mySidebar').style.display = 'none';
    vis.sidebar = false;

    if(vis.type == 2) { // cluster visualization
        frame.style.marginLeft = '170px';
        frame.style.width = 'calc(100% - 340px)';
    } else {
        frame.style.marginLeft = '10px';
        frame.style.width = 'calc(100% - 20px)';
    }
    
    slider.style.marginLeft = '10px';
    slider.style.width = 'calc(100% - 20px)';

    cluster.style.marginLeft = '10px';
    cluster.style.width = 'calc(100% - 20px)';
}

function openSlider() {
    cluster.style.display = 'none';
    slider.style.display = 'block';
    vis.type = 1;

    if(vis.sidebar) {
        frame.style.marginLeft = '210px';
        frame.style.width = 'calc(100% - 220px)';
    } else {
        frame.style.marginLeft = '10px';
        frame.style.width = 'calc(100% - 20px)';
    }

    frame.style.top = '10px';
    frame.style.height = 'calc(100% - 136px)';
}

function openCluster() {
    slider.style.display = 'none';
    cluster.style.display = 'block';
    vis.type = 2;

    if(vis.sidebar) {
        frame.style.marginLeft = '354px';
        frame.style.width = 'calc(100% - 508px)';
    } else {
        frame.style.marginLeft = '170px';
        frame.style.width = 'calc(100% - 340px)';
    }

    frame.style.top = '116px';
    frame.style.height = 'calc(100% - 234px)';
}

function closeImageVis() {
    cluster.style.display = 'none';
    slider.style.display = 'none';
    vis.type = 0;

    if(vis.sidebar) {
        frame.style.marginLeft = '210px';
        frame.style.width = 'calc(100% - 220px)';
    } else {
        frame.style.marginLeft = '10px';
        frame.style.width = 'calc(100% - 20px)';
    }

    frame.style.top = '10px';
    frame.style.height = 'calc(100% - 20px)';
}