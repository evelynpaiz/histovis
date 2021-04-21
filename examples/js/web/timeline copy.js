/* ---------------------- Variables ---------------------- */
var svg, brush;
var xAxis, xScale, xBand, yScale, zoomScale, tSelection;
var tMargin, tHeight, tWidth, tZoom;
var tData, startDate, endDate;

var colors = {handle: "#f27793", bar: "#009688"};

var yearFormat = d3.timeFormat("%Y");
var dynamicDateFormat = timeFormat([
    [d3.timeFormat("%Y"), function() { return true; }],
    [d3.timeFormat("%b %Y"), function(d) { return d.getMonth(); }],
    [d3.timeFormat("%d %b %Y"), function(d) { return d.getDay() && d.getDate() != 1; }],
    [function(){return "";}, function(d) { return d.getDate() != 1; }]
]);

/* ------------------------- Main ------------------------ */
initTimeline();

/* ----------------------- Functions --------------------- */

/* Init ---------------------------------------------- */
function initTimeline() {
    // Stablish a zoom level of 1
    tZoom = d3.zoomIdentity; 

    // Set the dimensions and margins of the graph
    var container = document.getElementById("myTimeline");
    container.innerHTML = "";
    const size = {w: container.clientWidth, h: container.clientHeight};

    tMargin = {top: 10, right: 35, bottom: 25, left: 35};
    tWidth = size.w - tMargin.left - tMargin.right;
    tHeight = size.h - tMargin.top - tMargin.bottom;

    // Append the svg object to the body of the page
    svg = d3.select(container)
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `0 0 ${size.w} ${size.h}`)
    .attr('opacity', 0)
    .classed("svg-content-responsive", true)
    .call(zoom);

    // Translate this svg element to leave some margin.
    const g = svg.append("g")
    .attr("transform", `translate(${tMargin.left}, ${tMargin.top})`);

    // Scale and axis
    xScale = d3.scaleTime()
        // This is the corresponding value I want in pixel
        .range([0, tWidth]);                         

    yScale = d3.scaleLinear()
        .range([tHeight, 0]);

    xAxis = d3.axisBottom()
        .scale(xScale)
        .tickFormat(dynamicDateFormat);

    zoomScale = xScale;

    g.append('g')
        .attr("class", "x-axis")
        .attr('transform', `translate(0, ${tHeight + 10})`)
        .call(xAxis);

    // Add a clippath (everything out of this area won't be drawn)
    g.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", tWidth)
        .attr("height", tHeight + 30)
        .attr("x", 0)
        .attr("y", -10);
        
    // Bars
    g.append('g')
        .attr("class", "chart")
        .attr("clip-path", "url(#clip)");

    // Append brush
    brush = d3.brushX()
    .handleSize(8)
    .extent([[0, tHeight], [tWidth, tHeight + 10]])
    .on('start brush end', brushing);

    const gBrush = g.append('g')
        .attr("class", "brush")
        .attr("clip-path", "url(#clip)");

    // Custom handlers
    const gHandles = gBrush.selectAll('g.handles')
        .data(['handle--o', 'handle--e'])
        .enter()
        .append('g')
        .attr('class', d => `handles ${d}`)
        .attr('fill', colors.handle);

    // Label
    gHandles.selectAll('text')
        .data(d => [d])
        .enter()
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 0);

    // Triangle
    var triangle = d3.symbol()
        .size(60)
        .type(d3.symbolTriangle);

    gHandles.selectAll('.triangle')
        .data(d => [d])
        .enter()
        .append('path')
        .attr('class', d => `triangle ${d}`)
        .attr('stroke', 'white')
        .attr('d', triangle)
        .attr('transform', d => {
            const x = d == 'handle--o' ? -4 : 4,
                rot = d == 'handle--o' ? -90 : 90;
            return `translate(${x}, ${tHeight+5}) rotate(${rot})`;
        });

    // Visible Line
    gHandles.selectAll('.line')
        .data(d => [d])
        .enter()
        .append('line')
        .attr('class', d => `line ${d}`)
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 0)
        .attr('y2', size.h - 25)
        .attr('stroke', colors.handle);
}

/* Updates ------------------------------------------- */
function updateTimeline(updateSelection = true) {
    if(Object.values(dates).length < 1) {
        // Update the graph
        svg.attr('opacity', 0);
    } else {
        var min =  new Date(Math.min.apply(null, Object.values(dates).map(d => {return d.start})));
        var max = new Date(Math.max.apply(null, Object.values(dates).map(d => {return d.end})));

        // Add one extra month of min and max 
        min = new Date(min.getFullYear(), 0, 1);
        max = new Date(max.getFullYear()+1, 0, 1);

        if(!startDate || !endDate || min.getTime() !== startDate.getTime() || max.getTime() !== endDate.getTime()) {
            startDate = min; endDate = max;

            // Create an array with all the dates and separete them into parent-children (year - month - day)
            var array = d3.scaleTime().domain([min, max]).ticks(d3.timeDay, 1);
            var data = d3.rollup(generateData(array), v => d3.sum(v, d => d.value),
                d => d3.timeYear(d.date), d => d3.timeMonth(d.date), d => d3.timeDay(d.date));
            // Create an hierarchy with the existing data
            tData = d3.hierarchy([null, data], ([key, value]) => value.size && Array.from(value))
                .sum(([key, value]) => value)
                .eachAfter(d => d.date = d.data[0]);

            // Update the timeline
            if(updateSelection) tSelection = d3.extent(getDataset(), d => d.date);
            updateTimelineData();
        }
    }
}

function updateTimelineData() {
    // Get the type of dataset to be used (year, month, day?)
    var data = getDataset();
    var time = getTimeScale();

    // Update the graph
    svg.attr('opacity', 1);

    // Update the x and y axis domains
    var start = new Date(startDate);
    var end = new Date(endDate);

    start.setFullYear(start.getFullYear() - 1);
    end.setFullYear(end.getFullYear() + 1);

    xScale.domain([start, end]);    // This is the min and the max of the data
    zoomScale.domain([start, end]);

    // Find the correct y scale
    yScale.domain([0, d3.max(tData.children, d => d.value)]);

    svg.selectAll(".x-axis")
        .call(xAxis.scale(zoomScale));

    svg.select(".chart").datum(tData);

    // Update the bar chart
    var bars = svg.select(".chart")
        .selectAll('rect')
        .data(data);

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .merge(bars) // get the already existing elements as well
        //.transition()
        .attr('x', d => xScale(d.date) - getBarWidth(xScale, time, d.date)/2)
        .attr('y', d => yScale(d.value))
        .attr("width", d => getBarWidth(xScale, time, d.date))
        .attr('height', d => tHeight - yScale(d.value))
        .attr('fill', colors.bar)
        .attr('opacity', 1);

    bars.exit().remove();
    /*
    var barGroup = svg.select(".chart")
        .selectAll('rect')
        .attr('opacity', 0)
        .data(data)
        
    barGroup.exit().remove();

    var enterGroup = barGroup.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.date))
        .attr('y', d => yScale(d.value))
        .attr("width", d => Math.abs(xScale(time.offset(d.date, 1)) - xScale(d.date) - 2))
        .attr('height', d => tHeight - yScale(d.value))
        .attr('fill', colors.bar);
        
    var mergedGroup = enterGroup.merge(barGroup)
        .transition()
        .duration(500)
        .attr('opacity', 1);
    */

    // Update the brushing
    svg.select(".brush")
        .call(brush)
        .call(brush.move, snappedSelection(xScale, getTimeScale(), tSelection));
}

function updateViewedCameras(start, end) {
    names = Object.entries(dates).sort().filter(([name, values]) => start < values.end && end > values.start)
        .map(([name, year]) => {return name;});

    cameras.children.forEach( cam => {
        var helper = cam.children[0];
        if(!names.includes(cam.name)) {
            helper.visible = false;
            multipleTextureMaterial.removeCamera(cam);
        } else {
            helper.visible = true;
            if(helper.userData.selected == true) multipleTextureMaterial.setCamera(cam);
        }
    });
}

/* Gets ---------------------------------------------- */
function getDataset() {
    var depth;
    if(tZoom.k < 2.5) depth = 1;
    else if(tZoom.k < 40) depth = 2;
    else depth = 3;

    return tData.descendants().filter(n => n.depth == depth);
}

function getTimeScale() {
    if(tZoom.k < 2.5) return d3.timeYear;
    else if(tZoom.k < 40) return d3.timeMonth;
    else return d3.timeDay;
}

function generateData(array) {
    var start = array.shift();

    // Update the timeline data
    return array.map(end => {
        var probability = 0;
        Object.values(dates).forEach(d => {
            if(start <= d.end && end >= d.start) {
                // Area under the curve of f(x)
                var fx = 1. / difference(d.start, d.end); // In days
                // Find x1 and x2 to be calculated
                var x1 = start < d.start ? d.start : start;
                var x2 = end > d.end ? d.end : end;
                // Calculate the area for the current segment
                probability += fx * difference(x1, x2); 
            }
        });
        var result = {date: start, value: probability};
        start = end;
        return result;
    });
}

function getBarWidth(scale, time, date) {
    return Math.abs(scale(time.offset(date, 1)) - scale(date) - 4)
}

/* Dates --------------------------------------------- */
function difference(date1, date2) {  
    var difference = Math.abs(date2 - date1);
    return difference/(1000 * 3600 * 24);
}

function timeFormat(formats) {
    return function(date) {
        var i = formats.length - 1, f = formats[i];
        while (!f[1](date)) f = formats[--i];
        return f[0](date);
    };
}

/* Interaction --------------------------------------- */
function zoom(svg) {
    const extent = [[tMargin.left, tMargin.top], [tWidth - tMargin.right, tHeight - tMargin.top]];

    svg.call(d3.zoom()
        .scaleExtent([1, 50])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed));

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        // Get the type of dataset to be used (year, month, day?)
        var time = getTimeScale();

        tZoom = d3.event.transform;
        zoomScale = tZoom.rescaleX(xScale);
        if(time !== getTimeScale()) {
            updateTimelineData(false);
        } else {
            svg.selectAll(".x-axis")
                .call(xAxis.scale(zoomScale));

            svg.selectAll(".bar")
                .attr("x", d => zoomScale(d.date) - getBarWidth(zoomScale, time, d.date)/2)
                .attr("width", d => getBarWidth(zoomScale, time, d.date));
    
            // Update the brushing
            svg.select(".brush")
                .call(brush)
                .call(brush.move, snappedSelection(zoomScale, time, tSelection));
            
            // Move handlers
            svg.selectAll('g.handles')
                .attr('transform', d => {
                const x = d == 'handle--o' ? zoomScale(d3.min(tSelection)) : zoomScale(d3.max(tSelection));
                return `translate(${x}, 0)`;
                });
        }
    }
}

function brushing() {
    var data = getDataset();
    var time = getTimeScale();
    
    if(!data || (!d3.event.selection && !d3.event.sourceEvent)) return; // ignore brush-by-zoom
    const s0 = d3.event.selection,
        d0 = s0.map(d => zoomScale.invert(d));

    const s1 = s0.map(d => {
            var result = d+getBarWidth(zoomScale, time, zoomScale.invert(d))/2;
            if(d == d3.min(s0)) result += 4;
            return result;
        }),
        d1 = filteredDomain(zoomScale, time, s1),
        d1Data = data.slice(d3.bisector(d => d.date).left(data, d3.min(d1)), d3.bisector(d => d.date).right(data, d3.max(d1)));
    
    if (d3.event.sourceEvent && d3.event.type === 'end') {
        d3.select(this).transition().call(brush.move, snappedSelection(zoomScale, time, d1));
    }

    // Update bars
    svg.selectAll('.bar')
        .attr('opacity', d => d1Data.includes(d) ? 1 : 0.2);

    // Move handlers
    svg.selectAll('g.handles')
        .attr('transform', d => {
            const x = d == 'handle--o' ? zoomScale(d3.min(d0)) : zoomScale(d3.max(d0));
            return `translate(${x}, 0)`;
        });

    // Update labels
    svg.selectAll('g.handles').selectAll('text')
        .attr('dx', d1.length > 1 ? 0 : 6)
        .text((d, i) => {
            let year;
            if (d1.length > 1) {
                year = d == 'handle--o' ? yearFormat(d3.min(d1)) : yearFormat(d3.max(d1));
            } else {
                year = d == 'handle--o' ? yearFormat(d3.min(d1)) : '';
            } 
            return year;
        });

    // Update the cameras
    updateViewedCameras(d3.min(d1), time.offset(d3.max(d1),1));

    tSelection = d1;
}

function snappedSelection(scale, time, domain) {
    var min = d3.min(domain),
        max = time.offset(d3.max(domain),1);
    return [min, max].map(d => scale(d)-getBarWidth(scale, time, d)/2-2);
}

function filteredDomain(scale, time, domain) {
    const floor = domain.map(d => time.floor(scale.invert(d))),
        ceil = domain.map(d => time.ceil(scale.invert(d)));

    return [d3.min(floor), time.offset(d3.max(ceil), -1)];
}