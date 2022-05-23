// TODO: d3.annotation, title, style

function vaccinationVisual() {
    // code for the line graph
    var svg = d3.select("#vaccination_line"),
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
        .x(d => x(d.mmwr_week))
        .y(d => y(d.unvaccinated_with_outcome));

    var line_unvaxed_bottom = d3.line()
        .x(d => x_bot(d.mmwr_week))
        .y(d => y_bot(d.unvaccinated_with_outcome));

    var line_primary_series_only_top = d3.line()
        .x(d => x(d.mmwr_week))
        .y(d => y(d.primary_series_only_with_outcome));

    var line_primary_series_only_bottom = d3.line()
        .x(d => x_bot(d.mmwr_week))
        .y(d => y_bot(d.primary_series_only_with_outcome));

    var line_boosted_top = d3.line()
        .x(d => x(d.mmwr_week))
        .y(d => y(d.boosted_with_outcome));

    var line_boosted_bottom = d3.line()
        .x(d => x_bot(d.mmwr_week))
        .y(d => y_bot(d.boosted_with_outcome));

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

    // for calculating the total death in the bar graph
    var total_unvaxed_death = 0,
        total_no_booster_death = 0,
        total_boosted_death = 0;

    d3.csv("../data/Rates_of_COVID-19_Cases_or_Deaths_by_Age_Group_and_Vaccination_Status_and_Booster_Dose.csv", conversion, function (error, data) {
        if (error) throw error;
        x.domain(d3.extent(data, d => d.mmwr_week));
        y.domain([0, d3.max(data, d => d.unvaccinated_with_outcome)]);
        x_bot.domain(x.domain());
        y_bot.domain(y.domain());

        // filter out unwanted rows
        data = data.filter(datum => (datum.age_group === "all_ages" && datum.vaccine_product === "all_types"));

        // this is for data in the bar graph
        data.forEach(datum => {
            total_unvaxed_death += datum.unvaccinated_with_outcome;
            total_no_booster_death += datum.primary_series_only_with_outcome;
            total_boosted_death += datum.boosted_with_outcome;
        });

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


        // code for the bar graph
        var categories = ["Unvaccinated", "Fully vaccinated, no booster", "Fully vaccinated + booster"];

        var total_death = total_unvaxed_death + total_no_booster_death + total_boosted_death;
        // calculate percentage
        var data_bar_arr = [total_unvaxed_death / total_death, total_no_booster_death / total_death, total_boosted_death / total_death];
        var data_bar = categories.map((c, i) => {
            return {
                category: c,
                death: data_bar_arr[i]
            }
        });

        var svg_bar = d3.select("#vaccination_bar"),
            x_bar = d3.scaleBand().range([0, width]).domain(categories).padding(0.5),
            y_bar = d3.scaleLinear().domain([0, 1]).range([height, 0]);

        var bar_graph = svg_bar.append("g")
            .attr("class", "bar_graph")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        bar_graph.append("g")
            .attr("transform", "translate(0," + height + ")")
            .attr("class", "axis axis--x")
            .call(d3.axisBottom(x_bar))
            .selectAll("text")
            .style("text-anchor", "middle");

        bar_graph.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y_bar).tickFormat(d3.format(".0%")));

        // Draw the bars
        bar_graph.selectAll("bars")
            .data(data_bar)
            .enter()
            .append("rect")
            .attr("x", d => x_bar(d.category))
            .attr("width", x_bar.bandwidth())
            .attr("fill", "#69b3a2")
            // no bar at the beginning thus:
            .attr("height", d => height - y_bar(0)) // always equal to 0
            .attr("y", d => y_bar(0))

        // Animation
        bar_graph.selectAll("rect")
            .transition()
            .duration(800)
            .attr("y", d => y_bar(d.death))
            .attr("height", d => height - y_bar(d.death))
            .delay((d, i) => i * 100)

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
        d.primary_series_only_with_outcome = +d.primary_series_only_with_outcome;
        d.boosted_with_outcome = +d.boosted_with_outcome;
        return d;
    }
}

vaccinationVisual();