function MapAll() {
    var animationTime = 800;

    var margin_choropleth = {
        top: 10,
        left: 10,
        bottom: 10,
        right: 10
    },
        width_choropleth = 500,
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
        .defer(d3.csv, "../data/2019_Census_US_Population_Data_By_State_Lat_Long.csv")
        .await(ready);

    function ready(error, dataGeo, data, population) {
        if (error) throw error;
        var centered;
        // Parse data
        var dataMap = structuredClone(data);
        dataMap = dataMap.filter(d => d.date === "2022-04-05");

        // calculate the death per 10,0000 people using population data for each state
        var ratio = population.map(d => ({
            state: d.STATE,
            ratio: +d.POPESTIMATE2019 / 100000.0
        }));

        function computeRatio(d) {
            return ratio.find(e => e.state === d.state).ratio;
        }

        // colors for deaths per 10,0000 people
        var dmin = d3.min(dataMap, function (d) { return +d.deaths / computeRatio(d) });
        var dmax = d3.max(dataMap, function (d) { return +d.deaths / computeRatio(d) });
        var dmid = (dmin + dmax) / 2;
        var colorForDeath = d3.scaleLinear()
            .domain([dmin, (dmin + dmid) / 2, dmid, (dmid + dmax) / 2, dmax])
            .range(['#ffd6d6', '#ffb3b3', '#ff8f8f', '#ff6b6b', '#ff4747']);
        // colors for vacc
        var vmin = d3.min(dataMap, function (d) { return +d.total_vaccinations / computeRatio(d) });
        var vmax = d3.max(dataMap, function (d) { return +d.total_vaccinations / computeRatio(d) });
        var vmid = (vmin + vmax) / 2;
        var colorForVacc = d3.scaleLinear()
            .domain([vmin, (vmin + vmid) / 2, vmid, (vmid + vmax) / 2, vmax])
            .range(['#C5E8B7', '#ABE098', '#83D475', '#57C84D', '#2EB62C']);

        const div_width = document.getElementById("main_visual_div").offsetWidth;
        var svg_choropleth = d3.select("#usamap")
            .attr("width", div_width)
            .attr("height", 450)
            .append("svg")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", "0 0 " + viewboxwidth + " " + viewboxheight * 1.2 + "");

        var map = svg_choropleth.append("g")
            .attr("id", "states")
            .selectAll("path")
            .data(dataGeo.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "#fff")
            .style("stroke-width", "0.1")
            .style("fill", function (d) {
                const s = dataMap.find(s => s.state === d.properties.name);
                if (s == null)
                    return;
                return colorForDeath(+s.deaths / computeRatio(s));
            })
            .on("click", clicked);

        // initial color label for death
        labelColor(colorForDeath);

        svg_choropleth.append("g")
            .attr("class", "states-names")
            .selectAll("text")
            .data(dataGeo.features)
            .enter()
            .append("svg:text")
            .text(function (d) {
                if (d.short.name == "PR")
                    return;
                return d.short.name;
            })
            .attr("x", function (d) {
                return path.centroid(d)[0];
            })
            .attr("y", function (d) {
                return path.centroid(d)[1];
            })
            .attr("text-anchor", "middle")
            .style("font", "8px times")
            .attr("fill", "grey")


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
                .duration(animationTime)
                .attr('transform', 'translate(' + viewboxwidth / 2 + ',' + viewboxheight / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');

            svg_choropleth.selectAll('text')
                .transition()
                .duration(animationTime)
                .attr('transform', 'translate(' + viewboxwidth / 2 + ',' + viewboxheight / 2 + ')scale(' + k + ')translate(' + -x + ',' + -y + ')');

            updateDeathLine(d, data, centered);
            updateVaccLine(d, data, centered);
        }

        // Display the labels for the color on map
        function labelColor(info) {
            // if there is alreay labels there, delete them
            const elements = document.getElementsByClassName("legend");
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }

            var colorLegend = legend()
                .units((info == colorForDeath) ? "Deaths(per 100,000 people)" : "Vaccination(per 100,000 people)")
                .cellWidth(30)
                .cellHeight(10)
                .inputScale(info)
                .cellStepping(50)
                .orientation("vertical");

            svg_choropleth.append("g")
                .attr("transform", "translate(0,20)").attr("class", "legend")
                .style("font", "8px times")
                .call(colorLegend);
        }

        function deathClick() {
            // Update color label
            labelColor(colorForDeath);

            d3.selectAll("path")
                .data(dataGeo.features)
                .transition()
                .duration(animationTime)
                .style("fill", function (d) {
                    const s = dataMap.find(s => s.state === d.properties.name);
                    if (s == null)
                        return "white";
                    return colorForDeath(s.deaths / computeRatio(s));
                })
        }

        function vaccClick() {
            // Update color label
            labelColor(colorForVacc);

            d3.selectAll("path")
                .data(dataGeo.features)
                .transition()
                .duration(animationTime)
                .style("fill", function (d) {
                    const s = dataMap.find(s => s.state === d.properties.name);
                    if (s == null)
                        return "white";
                    return colorForVacc(s.total_vaccinations / computeRatio(s));
                })
        }

        document.getElementById('deathButton').onclick = function () { deathClick() };
        document.getElementById('vaccButton').onclick = function () { vaccClick() };
    };

    // Line graph for Deaths
    const div_width = document.getElementById("main_left_graph").offsetWidth;
    var svg = d3.select("#deaths-line").attr("width", div_width).attr("height", 350),
        margin = { top: 0, right: 20, bottom: 110, left: 70 },
        margin2 = { top: 270, right: 20, bottom: 30, left: 70 },
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

    function parseDataForAllDeath(data) {
        var dataDeath = d3.nest()
            .key(function (f) { return f.date; })
            .rollup(function (f) {
                return d3.sum(f, function (g) { return g.deaths; });
            })
            .entries(data);

        // re-name because name changed from nest function
        dataDeath.forEach(function (d) {
            d.date = d.key;
            //covert date to Object since keys are Strings in d3
            d.date = new Date(d.date);
            d.deaths = d.value;
        });
        return dataDeath;
    }

    d3.csv("../folder/subfolder/out.csv", type, function (error, data) {
        if (error) throw error;

        // parse data
        var dataDeath = structuredClone(data);
        dataDeath = parseDataForAllDeath(dataDeath);

        x.domain(d3.extent(dataDeath, function (d) { return d.date; }));
        y.domain([0, d3.max(dataDeath, function (d) { return d.deaths; })]);
        x2.domain(x.domain());
        y2.domain(y.domain());

        // Axis
        focus.append("g")
            .attr("class", "axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        focus.append("g")
            .attr("class", "axis--y")
            .call(yAxis);

        // Line for Death
        Line_chart.append("path")
            .datum(dataDeath)
            .attr("class", "mainDeath")
            .attr("d", line);

        context.append("path")
            .datum(dataDeath)
            .attr("class", "mainDeath")
            .attr("d", line2);

        context.append("g")
            .attr("class", "axis--x")
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2);

        // Brush
        context.append("g")
            .attr("class", "brush")
            .call(brush)
            .call(brush.move, x.range());

        // Zoom
        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);

        // Axis labels
        svg.append("text")
            .attr("transform",
                "translate(" + (width / 2 + 70) + " ," +
                (height + margin.top + 40) + ")")
            .style("text-anchor", "middle")
            .text("Time");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 70)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Deaths");

    });

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        Line_chart.select(".mainDeath").attr("d", line);
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        Line_chart.select(".mainDeath").attr("d", line);
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }

    function type(d) {
        d.date = parseDate(d.date);
        d.deaths = +d.deaths;
        return d;
    }

    function updateDeathLine(d, data, centered) {
        var updateDataDeath = structuredClone(data);

        if (centered != null) {
            updateDataDeath = updateDataDeath.filter(function (f) {
                return f.state === d.properties.name;
            });
            updateDataDeath.forEach(function (d) {
                type(d);
            })

        } else {
            updateDataDeath = parseDataForAllDeath(updateDataDeath);
        }

        x.domain(d3.extent(updateDataDeath, function (d) { return d.date; }));
        y.domain([0, d3.max(updateDataDeath, function (d) { return d.deaths; })]);
        x2.domain(x.domain());
        y2.domain(y.domain());

        var svg = d3.select("#deaths-line");

        svg.select("#deaths-line > g:nth-child(2) > g.axis.axis--x")
            .transition()
            .duration(animationTime)
            .call(xAxis);

        svg.select("#deaths-line > g:nth-child(2) > g.axis.axis--y")
            .transition()
            .duration(animationTime)
            .call(yAxis);

        svg.select("#deaths-line > g.context > g.axis.axis--x")
            .transition()
            .duration(animationTime)
            .call(xAxis2);

        svg.select("#deaths-line > g:nth-child(1) > path")
            .datum(updateDataDeath)
            .transition()
            .duration(animationTime)
            .attr("d", line);

        svg.select("#deaths-line > g.context > path")
            .datum(updateDataDeath)
            .transition()
            .duration(animationTime)
            .attr("d", line2);
    }

    // ********************** CODE FOR VACCINATION GRAPH **********************************
    const div_width_vacc = document.getElementById("main_right_graph").offsetWidth;
    var svg_vacc = d3.select("#vacc-line").attr("width", div_width_vacc).attr("height", 350),
        margin_vacc = { top: 20, right: 20, bottom: 110, left: 90 },
        margin2_vacc = { top: 270, right: 20, bottom: 30, left: 90 },
        width_vacc = +svg_vacc.attr("width") - margin_vacc.left - margin_vacc.right,
        height_vacc = +svg_vacc.attr("height") - margin_vacc.top - margin_vacc.bottom,
        height2_vacc = +svg_vacc.attr("height") - margin2_vacc.top - margin2_vacc.bottom;

    var x_vacc = d3.scaleTime().range([0, width_vacc]),
        x2_vacc = d3.scaleTime().range([0, width_vacc]),
        y_vacc = d3.scaleLinear().range([height_vacc, 0]),
        y2_vacc = d3.scaleLinear().range([height2_vacc, 0]);

    var parseDate_vacc = d3.timeParse("%Y-%m-%d");

    var xAxis_vacc = d3.axisBottom(x_vacc),
        xAxis2_vacc = d3.axisBottom(x2_vacc),
        yAxis_vacc = d3.axisLeft(y_vacc);

    var brush_vacc = d3.brushX()
        .extent([[0, 0], [width_vacc, height2_vacc]])
        .on("brush end", brushed_vacc);

    var zoom_vacc = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width_vacc, height_vacc]])
        .extent([[0, 0], [width_vacc, height_vacc]])
        .on("zoom", zoomed_vacc);

    var line_vacc = d3.line()
        .x(function (d) { return x_vacc(d.date); })
        .y(function (d) { return y_vacc(d.total_vaccinations); });

    var line2_vacc = d3.line()
        .x(function (d) { return x2_vacc(d.date); })
        .y(function (d) { return y2_vacc(d.total_vaccinations); });

    var Line_chart_vacc = svg_vacc.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")")
        .attr("clip-path", "url(#clip)");

    var focus_vacc = svg_vacc.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")");

    var context_vacc = svg_vacc.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2_vacc.left + "," + margin2_vacc.top + ")");

    d3.csv("../folder/subfolder/out.csv", type_vacc, function (error, data) {
        if (error) throw error;

        // data = d3.nest()
        //     .key(function (f) { return f.date; })
        //     .rollup(function (f) {
        //         return d3.sum(f, function (g) {
        //             return g.total_vaccinations;
        //         });
        //     })
        //     .entries(data);
        // // filter out rows with 0 vacc
        // data = data.filter(function (d, i, arr) {
        //     return d.value > 0 && d.value > arr[i-1].value;
        // });
        // //re-name because name changed from nest function
        // data.forEach(function (d) {
        //     d.date = d.key;
        //     //covert date to Object since keys are Strings in d3
        //     d.date = new Date(d.date);
        //     d.total_vaccinations = d.value;
        // });
        data = parseDataForAllVacc(data);
        x_vacc.domain(d3.extent(data, function (d) { return d.date; }));
        y_vacc.domain([0, d3.max(data, function (d) { return d.total_vaccinations; })]);
        x2_vacc.domain(x_vacc.domain());
        y2_vacc.domain(y_vacc.domain());

        // Axis
        focus_vacc.append("g")
            .attr("class", "axis--x")
            .attr("transform", "translate(0," + height_vacc + ")")
            .call(xAxis_vacc);

        focus_vacc.append("g")
            .attr("class", "axis--y")
            .call(yAxis_vacc);

        // Line for Vacc
        Line_chart_vacc.append("path")
            .datum(data)
            .attr("class", "mainVacc")
            .attr("d", line_vacc);

        context_vacc.append("path")
            .datum(data)
            .attr("class", "mainVacc")
            .attr("d", line2_vacc);

        context_vacc.append("g")
            .attr("class", "axis--x")
            .attr("transform", "translate(0," + height2_vacc + ")")
            .call(xAxis2_vacc);

        // Brush
        context_vacc.append("g")
            .attr("class", "brush")
            .call(brush_vacc)
            .call(brush_vacc.move, x_vacc.range());

        // Zoom
        svg_vacc.append("rect")
            .attr("class", "zoom")
            .attr("width", width_vacc)
            .attr("height", height_vacc)
            .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")")
            .call(zoom_vacc);

        // Axis labels
        svg_vacc.append("text")
            .attr("transform",
                "translate(" + (width_vacc / 2 + 80) + " ," +
                (height_vacc + margin_vacc.top + 40) + ")")
            .style("text-anchor", "middle")
            .text("Time");

        svg_vacc.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin_vacc.left + 90)
            .attr("x", 0 - (height_vacc / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Vaccinations");
    });

    function brushed_vacc() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2_vacc.range();
        x_vacc.domain(s.map(x2_vacc.invert, x2_vacc));
        Line_chart_vacc.select(".mainVacc").attr("d", line_vacc);
        focus_vacc.select(".axis--x").call(xAxis_vacc);
        svg_vacc.select(".zoom").call(zoom_vacc.transform, d3.zoomIdentity
            .scale(width_vacc / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed_vacc() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x_vacc.domain(t.rescaleX(x2_vacc).domain());
        Line_chart_vacc.select(".mainVacc").attr("d", line_vacc);
        focus_vacc.select(".axis--x").call(xAxis_vacc);
        context_vacc.select(".brush").call(brush_vacc.move, x_vacc.range().map(t.invertX, t));
    }

    function type_vacc(d) {
        d.date = parseDate_vacc(d.date);
        d.total_vaccinations = +d.total_vaccinations;
        return d;
    }

    function parseDataForAllVacc(data) {
        var dataVacc = d3.nest()
            .key(function (f) { return f.date; })
            .rollup(function (f) {
                return d3.sum(f, function (g) { return g.total_vaccinations; });
            })
            .entries(data);

        var max = 0;
        dataVacc = dataVacc.filter(function (d) {
            if (d.value >= max) {
                max = d.value;
                return true;
            } else {
                return false;
            }
        });
        // re-name because name changed from nest function
        dataVacc.forEach(function (d) {
            d.date = d.key;
            //covert date to Object since keys are Strings in d3
            d.date = new Date(d.date);
            d.total_vaccinations = d.value;
        });
        return dataVacc;
    }


    function updateVaccLine(d, data, centered) {
        var updateDataVacc = structuredClone(data);

        if (centered != null) {
            updateDataVacc = updateDataVacc.filter(function (f) {
                return f.state === d.properties.name;
            });
        }
        updateDataVacc = parseDataForAllVacc(updateDataVacc);

        x_vacc.domain(d3.extent(updateDataVacc, function (d) { return d.date; }));
        y_vacc.domain([0, d3.max(updateDataVacc, function (d) { return d.total_vaccinations; })]);
        x2_vacc.domain(x_vacc.domain());
        y2_vacc.domain(y_vacc.domain());

        var svg = d3.select("#vacc-line");

        svg.select("#vacc-line > g:nth-child(2) > g.axis.axis--x")
            .transition()
            .duration(animationTime)
            .call(xAxis_vacc);

        svg.select("#vacc-line > g:nth-child(2) > g.axis.axis--y")
            .transition()
            .duration(animationTime)
            .call(yAxis_vacc);

        svg.select("#vacc-line > g.context > g.axis.axis--x")
            .transition()
            .duration(animationTime)
            .call(xAxis2_vacc);

        svg.select("#vacc-line > g:nth-child(1) > path")
            .datum(updateDataVacc)
            .transition()
            .duration(animationTime)
            .attr("d", line_vacc);

        svg.select("#vacc-line > g.context > path")
            .datum(updateDataVacc)
            .transition()
            .duration(animationTime)
            .attr("d", line2_vacc);
    }
}
setTimeout(MapAll, 5000);

// // Line graph for Vacc
// function LineForVacc() {
//     const div_width_vacc = document.getElementById("main_right_graph").offsetWidth;
//     var svg_vacc = d3.select("#vacc-line").attr("width", div_width_vacc).attr("height", 350),
//         margin_vacc = { top: 20, right: 20, bottom: 110, left: 90 },
//         margin2_vacc = { top: 270, right: 20, bottom: 30, left: 90 },
//         width_vacc = +svg_vacc.attr("width") - margin_vacc.left - margin_vacc.right,
//         height_vacc = +svg_vacc.attr("height") - margin_vacc.top - margin_vacc.bottom,
//         height2_vacc = +svg_vacc.attr("height") - margin2_vacc.top - margin2_vacc.bottom;

//     var x_vacc = d3.scaleTime().range([0, width_vacc]),
//         x2_vacc = d3.scaleTime().range([0, width_vacc]),
//         y_vacc = d3.scaleLinear().range([height_vacc, 0]),
//         y2_vacc = d3.scaleLinear().range([height2_vacc, 0]);

//     var parseDate_vacc = d3.timeParse("%Y-%m-%d");

//     var xAxis_vacc = d3.axisBottom(x_vacc),
//         xAxis2_vacc = d3.axisBottom(x2_vacc),
//         yAxis_vacc = d3.axisLeft(y_vacc);

//     var brush_vacc = d3.brushX()
//         .extent([[0, 0], [width_vacc, height2_vacc]])
//         .on("brush end", brushed_vacc);

//     var zoom_vacc = d3.zoom()
//         .scaleExtent([1, Infinity])
//         .translateExtent([[0, 0], [width_vacc, height_vacc]])
//         .extent([[0, 0], [width_vacc, height_vacc]])
//         .on("zoom", zoomed_vacc);

//     var line_vacc = d3.line()
//         .x(function (d) { return x_vacc(d.date); })
//         .y(function (d) { return y_vacc(d.total_vaccinations); });

//     var line2_vacc = d3.line()
//         .x(function (d) { return x2_vacc(d.date); })
//         .y(function (d) { return y2_vacc(d.total_vaccinations); });

//     var Line_chart_vacc = svg_vacc.append("g")
//         .attr("class", "focus")
//         .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")")
//         .attr("clip-path", "url(#clip)");

//     var focus_vacc = svg_vacc.append("g")
//         .attr("class", "focus")
//         .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")");

//     var context_vacc = svg_vacc.append("g")
//         .attr("class", "context")
//         .attr("transform", "translate(" + margin2_vacc.left + "," + margin2_vacc.top + ")");

//     d3.csv("../folder/subfolder/out.csv", type_vacc, function (error, data) {
//         if (error) throw error;

//         data = d3.nest()
//             .key(function (f) { return f.date; })
//             .rollup(function (f) {
//                 return d3.sum(f, function (g) {
//                     return g.total_vaccinations;
//                 });
//             })
//             .entries(data);
//         // filter out rows with 0 vacc
//         data = data.filter(function (d) {
//             return d.value > 0;
//         });
//         //re-name because name changed from nest function
//         data.forEach(function (d) {
//             d.date = d.key;
//             //covert date to Object since keys are Strings in d3
//             d.date = new Date(d.date);
//             d.total_vaccinations = d.value;
//         });

//         x_vacc.domain(d3.extent(data, function (d) { return d.date; }));
//         y_vacc.domain([0, d3.max(data, function (d) { return d.total_vaccinations; })]);
//         x2_vacc.domain(x_vacc.domain());
//         y2_vacc.domain(y_vacc.domain());

//         // Axis
//         focus_vacc.append("g")
//             .attr("class", "axis axis--x")
//             .attr("transform", "translate(0," + height_vacc + ")")
//             .call(xAxis_vacc);

//         focus_vacc.append("g")
//             .attr("class", "axis axis--y")
//             .call(yAxis_vacc);

//         // Line for Vacc
//         Line_chart_vacc.append("path")
//             .datum(data)
//             .attr("class", "mainVacc")
//             .attr("d", line_vacc);

//         context_vacc.append("path")
//             .datum(data)
//             .attr("class", "mainVacc")
//             .attr("d", line2_vacc);

//         context_vacc.append("g")
//             .attr("class", "axis axis--x")
//             .attr("transform", "translate(0," + height2_vacc + ")")
//             .call(xAxis2_vacc);

//         // Brush
//         context_vacc.append("g")
//             .attr("class", "brush")
//             .call(brush_vacc)
//             .call(brush_vacc.move, x_vacc.range());

//         // Zoom
//         svg_vacc.append("rect")
//             .attr("class", "zoom")
//             .attr("width_vacc", width_vacc)
//             .attr("height_vacc", height_vacc)
//             .attr("transform", "translate(" + margin_vacc.left + "," + margin_vacc.top + ")")
//             .call(zoom_vacc);

//         // Axis labels
//         svg_vacc.append("text")
//             .attr("transform",
//                 "translate(" + (width_vacc / 2 + 80) + " ," +
//                 (height_vacc + margin_vacc.top + 40) + ")")
//             .style("text-anchor", "middle")
//             .text("Time");

//         svg_vacc.append("text")
//             .attr("transform", "rotate(-90)")
//             .attr("y", 0 - margin_vacc.left + 90)
//             .attr("x", 0 - (height_vacc / 2))
//             .attr("dy", "1em")
//             .style("text-anchor", "middle")
//             .text("Vaccinations");
//     });

//     function brushed_vacc() {
//         if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
//         var s = d3.event.selection || x2_vacc.range();
//         x_vacc.domain(s.map(x2_vacc.invert, x2_vacc));
//         Line_chart_vacc.select(".mainVacc").attr("d", line_vacc);
//         focus_vacc.select(".axis--x").call(xAxis_vacc);
//         svg_vacc.select(".zoom").call(zoom_vacc.transform, d3.zoomIdentity
//             .scale(width_vacc / (s[1] - s[0]))
//             .translate(-s[0], 0));
//     }

//     function zoomed_vacc() {
//         if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
//         var t = d3.event.transform;
//         x_vacc.domain(t.rescaleX(x2_vacc).domain());
//         Line_chart_vacc.select(".mainVacc").attr("d", line_vacc);
//         focus_vacc.select(".axis--x").call(xAxis_vacc);
//         context_vacc.select(".brush").call(brush_vacc.move, x_vacc.range().map(t.invertX, t));
//     }

//     function type_vacc(d) {
//         d.date = parseDate_vacc(d.date);
//         d.total_vaccinations = +d.total_vaccinations;
//         return d;
//     }
// }
// LineForVacc();

// // Line graph for Vacc
// function LineForVacc() {
//     const div_width = document.getElementById("main_right_graph").offsetWidth;
//     var svg = d3.select("#vacc-line").attr("width", div_width).attr("height", 350),
//         margin = { top: 20, right: 20, bottom: 110, left: 90 },
//         margin2 = { top: 270, right: 20, bottom: 30, left: 90 },
//         width = +svg.attr("width") - margin.left - margin.right,
//         height = +svg.attr("height") - margin.top - margin.bottom,
//         height2 = +svg.attr("height") - margin2.top - margin2.bottom;

//     var x = d3.scaleTime().range([0, width]),
//         x2 = d3.scaleTime().range([0, width]),
//         y = d3.scaleLinear().range([height, 0]),
//         y2 = d3.scaleLinear().range([height2, 0]);

//     var parseDate = d3.timeParse("%Y-%m-%d");

//     var xAxis = d3.axisBottom(x),
//         xAxis2 = d3.axisBottom(x2),
//         yAxis = d3.axisLeft(y);

//     var brush = d3.brushX()
//         .extent([[0, 0], [width, height2]])
//         .on("brush end", brushed);

//     var zoom = d3.zoom()
//         .scaleExtent([1, Infinity])
//         .translateExtent([[0, 0], [width, height]])
//         .extent([[0, 0], [width, height]])
//         .on("zoom", zoomed);

//     var line = d3.line()
//         .x(function (d) { return x(d.date); })
//         .y(function (d) { return y(d.total_vaccinations); });

//     var line2 = d3.line()
//         .x(function (d) { return x2(d.date); })
//         .y(function (d) { return y2(d.total_vaccinations); });

//     var Line_chart = svg.append("g")
//         .attr("class", "focus")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
//         .attr("clip-path", "url(#clip)");

//     var focus = svg.append("g")
//         .attr("class", "focus")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//     var context = svg.append("g")
//         .attr("class", "context")
//         .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

//     d3.csv("../folder/subfolder/out.csv", type, function (error, data) {
//         if (error) throw error;

//         data = d3.nest()
//             .key(function (f) { return f.date; })
//             .rollup(function (f) {
//                 return d3.sum(f, function (g) {
//                     return g.total_vaccinations;
//                 });
//             })
//             .entries(data);
//         // filter out rows with 0 vacc
//         data = data.filter(function (d) {
//             return d.value > 0;
//         });
//         //re-name because name changed from nest function
//         data.forEach(function (d) {
//             d.date = d.key;
//             //covert date to Object since keys are Strings in d3
//             d.date = new Date(d.date);
//             d.total_vaccinations = d.value;
//         });

//         x.domain(d3.extent(data, function (d) { return d.date; }));
//         y.domain([0, d3.max(data, function (d) { return d.total_vaccinations; })]);
//         x2.domain(x.domain());
//         y2.domain(y.domain());

//         // Axis
//         focus.append("g")
//             .attr("class", "axis axis--x")
//             .attr("transform", "translate(0," + height + ")")
//             .call(xAxis);

//         focus.append("g")
//             .attr("class", "axis axis--y")
//             .call(yAxis);

//         // Line for Vacc
//         Line_chart.append("path")
//             .datum(data)
//             .attr("class", "mainVacc")
//             .attr("d", line);

//         context.append("path")
//             .datum(data)
//             .attr("class", "mainVacc")
//             .attr("d", line2);

//         context.append("g")
//             .attr("class", "axis axis--x")
//             .attr("transform", "translate(0," + height2 + ")")
//             .call(xAxis2);

//         // Brush
//         context.append("g")
//             .attr("class", "brush")
//             .call(brush)
//             .call(brush.move, x.range());

//         // Zoom
//         svg.append("rect")
//             .attr("class", "zoom")
//             .attr("width", width)
//             .attr("height", height)
//             .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
//             .call(zoom);

//         // Axis labels
//         svg.append("text")
//             .attr("transform",
//                 "translate(" + (width / 2 + 80) + " ," +
//                 (height + margin.top + 40) + ")")
//             .style("text-anchor", "middle")
//             .text("Time");

//         svg.append("text")
//             .attr("transform", "rotate(-90)")
//             .attr("y", 0 - margin.left + 90)
//             .attr("x", 0 - (height / 2))
//             .attr("dy", "1em")
//             .style("text-anchor", "middle")
//             .text("Vaccinations");
//     });

//     function brushed() {
//         if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
//         var s = d3.event.selection || x2.range();
//         x.domain(s.map(x2.invert, x2));
//         Line_chart.select(".mainVacc").attr("d", line);
//         focus.select(".axis--x").call(xAxis);
//         svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
//             .scale(width / (s[1] - s[0]))
//             .translate(-s[0], 0));
//     }

//     function zoomed() {
//         if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
//         var t = d3.event.transform;
//         x.domain(t.rescaleX(x2).domain());
//         Line_chart.select(".mainVacc").attr("d", line);
//         focus.select(".axis--x").call(xAxis);
//         context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
//     }

//     function type(d) {
//         d.date = parseDate(d.date);
//         d.total_vaccinations = +d.total_vaccinations;
//         return d;
//     }
// }
// LineForVacc();