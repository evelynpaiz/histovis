var vis = {sidebar: true, type: 0};

const frame = document.getElementById("myRenderer");
var slider = document.getElementById("mySlider");
var content = document.getElementById("myContent");
var cluster = document.getElementById("myCluster");

frame.addEventListener("load", function() {
    var collections = frame.contentWindow.collections;
    document.getElementById('myCollections').innerHTML = '';
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

    slider.style.marginLeft = '210px';
    slider.style.width = 'calc(100% - 220px)';

    content.style.marginLeft = '210px';
    content.style.width = 'calc(100% - 220px)';
}

function closeMenu() {
    document.getElementById('mySidebar').style.display = 'none';
    vis.sidebar = false;
    
    slider.style.marginLeft = '10px';
    slider.style.width = 'calc(100% - 20px)';

    content.style.marginLeft = '10px';
    content.style.width = 'calc(100% - 20px)';
}

function openSlider() {
    slider.style.display = 'block';
    cluster.style.display = 'none';
    vis.type = 1;

    frame.style.marginLeft = '0px';
    frame.style.width = '100%';
    frame.style.top = '0px';
    frame.style.height = '100%';

    fullContent();
    content.style.height = 'calc(100% - 136px)';
}

function openCluster() {
    slider.style.display = 'none';
    cluster.style.display = 'block';
    vis.type = 2;

    fullContent();

    frame.style.marginLeft = '144px';
    frame.style.width = 'calc(100% - 288px)';
    frame.style.top = '116px';
    frame.style.height = 'calc(100% - 234px)';
}

function closeImageVis() {
    slider.style.display = 'none';
    cluster.style.display = 'none';
    vis.type = 0;

    fullContent();

    frame.style.marginLeft = '0px';
    frame.style.width = '100%';
    frame.style.top = '0px';
    frame.style.height = '100%';
}

function fullContent() {
    if(vis.sidebar) {
        content.style.marginLeft = '210px';
        content.style.width = 'calc(100% - 220px)';
    } else {
        content.style.marginLeft = '10px';
        content.style.width = 'calc(100% - 20px)';
    }

    content.style.top = '10px';
    content.style.height = 'calc(100% - 20px)';
}