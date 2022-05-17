// TODO: d3.annotation, title, style

var svg = d3.select("#vaccination"),
    margin = { top: 20, right: 20, bottom: 110, left: 40 },
    margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    height2 = +svg.attr("height") - margin2.top - margin2.bottom;

var x = d3.scaleTime().range([0, width]),
    x_bot = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y_bot = d3.scaleLinear().range([height2, 0]);

var parseDate = d3.timeParse("%Y%V");

var xAxis = d3.axisBottom(x),
    xAxis2 = d3.axisBottom(x_bot),
    yAxis = d3.axisLeft(y);

var brush = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on("brush end", brushed);

var zoom = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

// lines for the graph
var line_unvaxed_top = d3.line()
    .x(function (d) { return x(d.mmwr_week); })
    .y(function (d) { return y(d.unvaccinated_with_outcome); });

var line_unvaxed_bottom = d3.line()
    .x(function (d) { return x_bot(d.mmwr_week); })
    .y(function (d) { return y_bot(d.unvaccinated_with_outcome); });

var line_primary_series_only_top = d3.line()
    .x(function (d) { return x(d.mmwr_week); })
    .y(function (d) { return y(d.primary_series_only_with_outcome); });

var line_primary_series_only_bottom = d3.line()
    .x(function (d) { return x_bot(d.mmwr_week); })
    .y(function (d) { return y_bot(d.primary_series_only_with_outcome); });

var line_boosted_top = d3.line()
    .x(function (d) { return x(d.mmwr_week); })
    .y(function (d) { return y(d.boosted_with_outcome); });

var line_boosted_bottom = d3.line()
    .x(function (d) { return x_bot(d.mmwr_week); })
    .y(function (d) { return y_bot(d.boosted_with_outcome); });

svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

var top_graph = svg.append("g")
    .attr("class", "top_graph")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var bottom_graph = svg.append("g")
    .attr("class", "bottom_graph")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

d3.csv("../data/Rates_of_COVID-19_Cases_or_Deaths_by_Age_Group_and_Vaccination_Status_and_Booster_Dose.csv", conversion, function (error, data) {
    if (error) throw error;

    x.domain(d3.extent(data, function (d) { return d.mmwr_week; }));
    y.domain([0, d3.max(data, function (d) { return d.unvaccinated_with_outcome; })]);
    x_bot.domain(x.domain());
    y_bot.domain(y.domain());

    // filter out unwanted rows
    data = data.filter(datum => (datum.age_group === "all_ages" && datum.vaccine_product === "all_types"));

    // get the data for different vaccination status
    const unvaccinated_data = data.map(datum => ({ mmwr_week: datum.mmwr_week, unvaccinated_with_outcome: datum.unvaccinated_with_outcome }));
    const primary_series_only_data = data.map(datum => ({ mmwr_week: datum.mmwr_week, primary_series_only_with_outcome: datum.primary_series_only_with_outcome }));
    const boosted_data = data.map(datum => ({ mmwr_week: datum.mmwr_week, boosted_with_outcome: datum.boosted_with_outcome }));

    // for code simplicity
    const data_arr = [unvaccinated_data, primary_series_only_data, boosted_data];
    const id_arr = ["unvaxed_line", "primary_series_only_line", "boosted_line"];
    const line_top_arr = [line_unvaxed_top, line_primary_series_only_top, line_boosted_top];
    const line_bottom_arr = [line_unvaxed_bottom, line_primary_series_only_bottom, line_boosted_bottom];

    //draw the lines using path in top graph
    data_arr.forEach((datum, i) => {
        top_graph.append("path")
            .datum(datum)
            .attr("class", "line")
            .attr("id", id_arr[i])
            .attr("d", line_top_arr[i]);
    });

    // draw x and y axis of top
    top_graph.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    top_graph.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    // draw the paths in the bottom graph
    data_arr.forEach((datum, i) =>
        bottom_graph.append("path")
            .datum(datum)
            .attr("class", "line")
            .attr("id", id_arr[i])
            .attr("d", line_bottom_arr[i]));

    // draw x and y axis of bottom
    bottom_graph.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);
    bottom_graph.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    svg.append("rect")
        .attr("class", "zoom")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(zoom);
});

function brushed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
    var s = d3.event.selection || x_bot.range();
    x.domain(s.map(x_bot.invert, x_bot));
    top_graph.select("#unvaxed_line").attr("d", line_unvaxed_top);
    top_graph.select("#primary_series_only_line").attr("d", line_primary_series_only_top);
    top_graph.select("#boosted_line").attr("d", line_boosted_top);
    top_graph.select(".axis--x").call(xAxis);
    svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
        .scale(width / (s[1] - s[0]))
        .translate(-s[0], 0));
}

function zoomed() {
    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
    var t = d3.event.transform;
    x.domain(t.rescaleX(x_bot).domain());
    top_graph.select("#unvaxed_line").attr("d", line_unvaxed_top);
    top_graph.select("#primary_series_only_line").attr("d", line_primary_series_only_top);
    top_graph.select("#boosted_line").attr("d", line_boosted_top);
    top_graph.select(".axis--x").call(xAxis);
    bottom_graph.select(".brush").call(brush.move, x.range().map(t.invertX, t));
}


function conversion(d) {
    d.mmwr_week = parseDate(d.mmwr_week);
    d.unvaccinated_with_outcome = +d.unvaccinated_with_outcome;
    return d;
}