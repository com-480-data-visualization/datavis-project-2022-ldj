// Map for all
function MapAll() {
    var margin_choropleth = {
        top: 10,
        left: 10,
        bottom: 10,
        right: 10
    },
        width_choropleth = 857,
        width_choropleth = width_choropleth - margin_choropleth.left - margin_choropleth.right,
        mapRatio = .5,
        height_choropleth = width_choropleth * mapRatio;

    // D3 Projection
    var projection = d3.geoAlbersUsa()
        .scale(width_choropleth)
        .translate([width_choropleth / 2, height_choropleth / 2]);

    // Define path generator
    var path = d3.geoPath()
        .projection(projection);

    var viewboxwidth = width_choropleth * 1;
    var viewboxheight = height_choropleth - 20;
    
    // Load us shape AND number of deaths/vacc
    d3.queue()
    .defer(d3.json, "./usStates.json")  // US shape
    .defer(d3.csv, "../folder/subfolder/out.csv") // Deaths and Vacc
    .await(ready);

    function ready(error, dataGeo, data) {
        if (error) throw error;

        var centered;
        
        // Parse data
        data = data.filter(d => d.date === "2022-04-05");
        console.log(data)

        // colors for deaths
        var colorForDeath = d3.scaleLinear()
                        .domain([
                            d3.min(data, function(d) {return +d.deaths}),
                            d3.max(data, function(d) {return +d.deaths})
                        ])
                        .range(['#eeeeee','#f26161','#f03939','#ea0909','#9a0707']);
        // colors for vacc
        var colorForVacc = d3.scaleLinear()
                        .domain([
                            d3.min(data, function(d) {return +d.total_vaccinations}),
                            d3.max(data, function(d) {return +d.total_vaccinations})
                        ])
                        .range(['#eefdec','#719b25','#2e6409','#2c4928','#192819']);

        var svg_choropleth = d3.select("#usamap")
            .append("svg")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + viewboxwidth + " " + viewboxheight + "");

        var map = svg_choropleth.append("g")
            .attr("id", "states")
            .selectAll("path")
            .data(dataGeo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "#fff")
            .style("stroke-width", "0.1")
            .style("fill", function(d) {
                const s = data.find(s => s.state === d.properties.name);
                if (s == null)
                    return;
                return colorForDeath(s.deaths);
            })
            .on("click", clicked);

        svg_choropleth.append("g")
            .attr("class", "states-names")
            .selectAll("text")
            .data(dataGeo.features)
            .enter()
            .append("svg:text")
            .text(function (d) {
                return d.short.name;
            })
            .attr("x", function (d) {
                return path.centroid(d)[0];
            })
            .attr("y", function (d) {
                return path.centroid(d)[1];
            })
            .attr("text-anchor", "middle")
            .attr("fill", "grey");


        function clicked(d) {

            var x, y, k;

            if (d && centered !== d) {
                var centroid = path.centroid(d);
                x = centroid[0];
                y = centroid[1];
                k = 4;
                centered = d;

            } else {
                x = viewboxwidth / 2;
                y = viewboxheight / 2;
                k = 1;
                centered = null;
            }

            map.selectAll('path')
                .classed('active', centered && function (d) {
                    return d === centered;
                });

            map.transition()
                .duration(750)
                .attr('transform', 'translate(' + viewboxwidth / 2 + ',' + viewboxheight / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');

            svg_choropleth.selectAll('text')
                .transition()
                .duration(750)
                .attr('transform', 'translate(' + viewboxwidth / 2 + ',' + viewboxheight / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');
        }

        function deathClick() {
            d3.selectAll("path")
              .data(dataGeo.features)
              .transition()
              .duration(2000)
              .style("fill", function(d) {
                const s = data.find(s => s.state === d.properties.name);
                if (s == null)
                    return "white";
                console.log(s)
                return colorForDeath(s.deaths);
            })
        }

        function vaccClick() {
            d3.selectAll("path")
              .data(dataGeo.features)
              .transition()
              .duration(2000)
              .style("fill", function(d) {
                const s = data.find(s => s.state === d.properties.name);
                if (s == null)
                    return "white";
                    console.log(s)
                return colorForVacc(s.total_vaccinations);
            })
        }

        document.getElementById('deathButton').onclick = function() {deathClick()};
        document.getElementById('vaccButton').onclick = function() {vaccClick()};
    };
}
MapAll();

// Line graph for Deaths
function LineForDeath() {
    var svg = d3.select("svg"),
        margin = {top: 20, right: 20, bottom: 110, left: 70},
        margin2 = {top: 430, right: 20, bottom: 30, left: 70},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        height2 = +svg.attr("height") - margin2.top - margin2.bottom;

    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var parseDate = d3.timeParse("%Y-%m-%d");

    var xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y);

    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    var line = d3.line()
        .x(function (d) { return x(d.date); })
        .y(function (d) { return y(d.deaths); });

    var line2 = d3.line()
        .x(function (d) { return x2(d.date); })
        .y(function (d) { return y2(d.deaths); });

    // var clip = svg.append("defs").append("svg:clipPath")
    //     .attr("id", "clip")
    //     .append("svg:rect")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr("x", 0)
    //     .attr("y", 0); 


    var Line_chart = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("clip-path", "url(#clip)");


    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    d3.csv("../folder/subfolder/out.csv", type, function (error, data) {
        if (error) throw error;

        //sum deaths in all states for each date
        data = d3.nest()
        .key(function(f) { return f.date;})
        .rollup(function(f) { 
            return d3.sum(f, function(g) {return g.deaths; });
        }).entries(data);
        //re-name because name changed from nest function
        data.forEach(function(d) {
            d.date = d.key;
            //covert date to Object since keys are Strings in d3
            d.date = new Date(d.date);
            d.deaths = d.value;
        })
        
        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([0, d3.max(data, function (d) { return d.deaths; })]);
        x2.domain(x.domain());
        y2.domain(y.domain());

        focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        focus.append("g")
            .attr("class", "axis axis--y")
            .call(yAxis);

        Line_chart.append("path")
            .datum(data)
            .attr("class", "mainLine")
            .attr("d", line);

        context.append("path")
            .datum(data)
            .attr("class", "mainLine")
            .attr("d", line2);

        context.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2);

        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());

        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

        // Add axis labels
        svg.append("text")             
        .attr("transform",
                "translate(" + (width/2 + 50) + " ," + 
                                (height + margin.top + 40) + ")")
        .style("text-anchor", "middle")
        .text("Date");

        svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 70)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Deaths"); 
    });

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        Line_chart.select(".mainLine").attr("d", line);
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        Line_chart.select(".mainLine").attr("d", line);
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }

    function type(d) {
        d.date = parseDate(d.date);
        d.deaths = +d.deaths;
        return d;
    }
}
LineForDeath();