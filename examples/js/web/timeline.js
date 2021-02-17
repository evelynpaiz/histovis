/* ---------------------- Variables ---------------------- */
var svg, brush;
var xAxis, xScale, yScale, zoomScale, tSelection;
var tMargin, tHeight, tWidth, tZoom;
var tData = {}, startDate, endDate;

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
    if(window.location !== window.parent.location) {
        // Stablish a zoom level of 1
        tZoom = d3.zoomIdentity; 

        // Set the dimensions and margins of the graph
        var container = parent.document.getElementById("myTimeline");
        container.innerHTML = "";
        const size = {w: container.clientWidth, h: container.clientHeight};

        tMargin = {top: 0, right: 35, bottom: 25, left: 35};
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
            .attr("height", tHeight + 15)
            .attr("x", 0)
            .attr("y", 0);

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
            .attr('dy', 10);

        // Triangle
        var triangle = d3.symbol()
            .size(50)
            .type(d3.symbolTriangle);

        gHandles.selectAll('.triangle')
            .data(d => [d])
            .enter()
            .append('path')
            .attr('class', d => `triangle ${d}`)
            .attr('d', triangle)
            .attr('transform', d => {
                const x = d == 'handle--o' ? -6 : 6,
                    rot = d == 'handle--o' ? -90 : 90;
                return `translate(${x}, ${size.h / 2}) rotate(${rot})`;
            });

        // Visible Line
        gHandles.selectAll('.line')
            .data(d => [d])
            .enter()
            .append('line')
            .attr('class', d => `line ${d}`)
            .attr('x1', 0)
            .attr('y1', 15)
            .attr('x2', 0)
            .attr('y2', size.h - 15)
            .attr('stroke', colors.handle);
    }
}

/* Updates ------------------------------------------- */
function updateTimeline(updateSelection = true) {
    // Checks if it has a parent document
    if(window.location !== window.parent.location && Object.values(dates).length > 0) {
        var min =  new Date(Math.min.apply(null, Object.values(dates).map(d => {return d.start})));
        var max = new Date(Math.max.apply(null, Object.values(dates).map(d => {return d.end})));

        // Add one extra month of min and max 
        min = new Date(min.getFullYear(), 0, 1);
        max = new Date(max.getFullYear()+1, 0, 1);

        if(!startDate || !endDate || min.getTime() !== startDate.getTime() || max.getTime() !== endDate.getTime()) {
            startDate = min; endDate = max;

            var dayArray = d3.scaleTime().domain([min, max]).ticks(d3.timeDay, 1);
            var monthArray = d3.scaleTime().domain([min, max]).ticks(d3.timeMonth, 1);
            var yearArray = d3.scaleTime().domain([min, max]).ticks(d3.timeYear, 1);

            tData.day = generateData(dayArray);
            tData.month = generateData(monthArray);
            tData.year = generateData(yearArray);

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
    //var array = [...tData.day, ...tData.month, ...tData.year];
    yScale.domain(d3.extent(data, d => d.value));

    svg.selectAll(".x-axis")
        .call(xAxis.scale(zoomScale));

    // Update the bar chart
    var bars = svg.select(".chart")
        .selectAll('rect')
        .data(data);

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .merge(bars) // get the already existing elements as well
        .transition()
        .attr('x', d => xScale(d.date))
        .attr('y', d => yScale(d.value))
        .attr("width", d => Math.abs(xScale(time.offset(d.date, 1)) - xScale(d.date) - 2))
        .attr('height', d => tHeight - yScale(d.value))
        .attr('fill', colors.bar)
        .attr('opacity', 1);

    bars.exit().remove();

    // Update the brushing
    svg.select(".brush")
        .call(brush)
        .call(brush.move, [xScale(tSelection[0]), xScale(time.offset(tSelection[1], 1))]);
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
    if(tZoom.k < 2.5) return tData.year;
    else if(tZoom.k < 40) return tData.month;
    else return tData.day;
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
                .attr("x", d => zoomScale(d.date))
                .attr("width", d => Math.abs(zoomScale(time.offset(d.date, 1)) - zoomScale(d.date) - 2));
    
            // Update the brushing
            svg.select(".brush")
                .call(brush)
                .call(brush.move, [zoomScale(tSelection[0]), zoomScale(tSelection[1])]);
            
            // Move handlers
            svg.selectAll('g.handles')
                .attr('transform', d => {
                const x = d == 'handle--o' ? zoomScale(tSelection[0]) : zoomScale(tSelection[1]);
                return `translate(${x}, 0)`;
                });
        }
    }
}

function brushing() {
    var data = getDataset();
    var time = getTimeScale();

    if(data && (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom")) return; // ignore brush-by-zoom
    const s0 = d3.event.selection,
          d0 = [zoomScale.invert(s0[0]), zoomScale.invert(s0[1])],
          d1 = data.slice(d3.bisector(d => d.date).left(data, d0[0]), d3.bisector(d => d.date).right(data, d0[1]));

    //if (d3.event.sourceEvent && d3.event.type === 'end') {
        //d0 = [zoomScale(time.offset(d0[0], 1)), zoomScale(time.offset(d0[1], 1))];
        //d3.select(this).transition().call(d3.event.target.move, s1);
    //}

    // Update bars
    svg.selectAll('.bar')
        .attr('opacity', d => d1.includes(d) ? 1 : 0.2);

    // Move handlers
    svg.selectAll('g.handles')
        .attr('transform', d => {
            const x = d == 'handle--o' ? zoomScale(d0[0]) : zoomScale(d0[1]);
            return `translate(${x}, 0)`;
        });

    // Update labels
    svg.selectAll('g.handles').selectAll('text')
        .attr('dx', d0.length > 1 ? 0 : 6)
        .text((d, i) => {
            let year;
            if (d0.length > 1) {
                year = d == 'handle--o' ? yearFormat(d3.min(d0)) : yearFormat(d3.max(d0));
            } else {
                year = d == 'handle--o' ? yearFormat(d3.min(d0)) : '';
            } 
            return year;
        });

    // Update the cameras
    updateViewedCameras(d0[0], d0[1]);

    tSelection = d0;
}