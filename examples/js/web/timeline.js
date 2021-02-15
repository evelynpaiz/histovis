/* ---------------------- Variables ---------------------- */
var svg, brush;
var xAxis, xScale, yScale, zoomScale, selection;
var tMargin, tHeight, tWidth;
var timelineData, startDate, endDate;

var colors = {handle: "#f27793", bar: "#009688"};

var yearFormat = d3.timeFormat("%Y");
var dynamicDateFormat = timeFormat([
    [d3.timeFormat("%Y"), function() { return true; }],// <-- how to display when Jan 1 YYYY
    [d3.timeFormat("%b %Y"), function(d) { return d.getMonth(); }],
    [function(){return "";}, function(d) { return d.getDate() != 1; }]
]);

/* ----------------------- Functions --------------------- */
initTimeline();

function initTimeline() {
    if(window.location !== window.parent.location) {
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
            .range([0, tWidth]);                         // This is the corresponding value I want in pixel

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

        // Bars
        g.append('g')
            .attr("class", "chart");

        // Append brush
        brush = d3.brushX()
        .handleSize(8)
        .extent([[-5, tHeight], [tWidth+10, tHeight + 10]])
        .on('start brush end', brushing);

        const gBrush = g.append('g')
            .attr("class", "brush");

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

function checkTimeline() {
    // Checks if it has a parent document
    if(window.location !== window.parent.location && Object.values(dates).length > 0) {
        var min =  new Date(Math.min.apply(null, Object.values(dates).map(d => {return d.start})));
        var max = new Date(Math.max.apply(null, Object.values(dates).map(d => {return d.end})));

        // Add one extra month of min and max 
        min.setMonth(min.getMonth() - 1);
        max.setMonth(max.getMonth() + 1);

        if(!startDate || !endDate || min.getTime() !== startDate.getTime() || max.getTime() !== endDate.getTime()) {
            startDate = min;
            endDate = max;

            var dateArray = d3.scaleTime()
                .domain([min, max])
                .ticks(d3.timeMonth, 1); // In months

            var start = min;

            timelineData = dateArray.map(end => {
                var probability = 0;
                Object.values(dates).forEach(d => {
                    if(start < d.end && end > d.start) {
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

            updateTimeline(timelineData);
        } 
    }
}

function difference(date1, date2) {  
    var difference= Math.abs(date2 - date1);
    return difference/(1000 * 3600 * 24);
}

function updateTimeline(data) {
    timelineData = data;
    svg.attr('opacity', 1);

    // Update the x and y axis domains
    xScale.domain(d3.extent(data, d => d.date));    // This is the min and the max of the data
    yScale.domain(d3.extent(data, d => d.value));
    zoomScale.domain(d3.extent(data, d => d.date));

    svg.selectAll(".x-axis")
        .call(xAxis);

    // Update the bar chart
    var bars = svg.select(".chart")
        .selectAll('rect')
        .data(data);

    selection = [zoomScale.invert(-5), zoomScale.invert(tWidth + 10)];

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.date))
        .attr('y', d => tHeight - yScale(d.value))
        .attr("width", d => xScale(d3.timeMonth.offset(d.date, 1)) - xScale(d.date) - 2)
        .attr('height', d => yScale(d.value))
        .attr('fill', colors.bar)
        .attr('opacity', 1);

    bars.exit().remove();

    // Update the brushing
    svg.select(".brush")
        .call(brush)
        .call(brush.move, [zoomScale(selection[0]), zoomScale(selection[1])]);
}

function timeFormat(formats) {
    return function(date) {
        var i = formats.length - 1, f = formats[i];
        while (!f[1](date)) f = formats[--i];
        return f[0](date);
    };
}

function zoom(svg) {
    const extent = [[tMargin.left, tMargin.top], [tWidth - tMargin.right, tHeight - tMargin.top]];

    svg.call(d3.zoom()
        .scaleExtent([0.25, 8])
        .translateExtent(extent)
        .extent(extent)
        .on("zoom", zoomed));

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        zoomScale = t.rescaleX(xScale);
        svg.selectAll(".x-axis").call(xAxis.scale(zoomScale));
        svg.selectAll(".bar").attr("x", d => zoomScale(d.date)).attr("width", d => zoomScale(d3.timeMonth.offset(d.date, 1)) - zoomScale(d.date) - 2);
        
        // Update the brushing
        svg.select(".brush")
            .call(brush)
            .call(brush.move, [zoomScale(selection[0]), zoomScale(selection[1])]);
        
            // Move handlers
        svg.selectAll('g.handles')
            .attr('transform', d => {
            const x = d == 'handle--o' ? zoomScale(selection[0]) : zoomScale(selection[1]);
            return `translate(${x}, 0)`;
            });
    }
}

function brushing() {
    if(!timelineData || (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom")) return; // ignore brush-by-zoom
    const s0 = d3.event.selection,
    d0 = [zoomScale.invert(s0[0]), zoomScale.invert(s0[1])],
    d1 = timelineData.slice(d3.bisector(d => d.date).left(timelineData, d0[0]), d3.bisector(d => d.date).right(timelineData, d0[1]));

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

    selection = d0;
}