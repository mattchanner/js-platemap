(function (root, factory) {

    // Assumes d3 is available as a module when define is present
    if (typeof define == 'function' && define.amd) {
        define(['exports', 'd3'], factory);
    } else {
        // Register on the root object instead
        factory((root.heatmap = {}), root.d3);
    }

} (this, function (heatmap, d3) {

    /*-------------------------------------------------------
    / heatmap.view
    /------------------------------------------------------*/
    (function (){

        // A function used to render a heatmap
        heatmap.view = (function () {
            var dimensions = {rows: 8, cols: 12},
                width,
                height,
                xScale = d3.scale.linear(),
                yScale = d3.scale.linear(),
                xValue = function (d) { return d[0]; },
                yValue = function (d) { return d[1]; },
                padding = 20,
                data = [],
                size = 10,
                roundwells = false,
                heatmap,
                colours,
                cellWidth,
                cellHeight,
                dispatcher = d3.dispatch("cell:mouseover", "cell:mouseout", "cell:click");

            // Configuration function to chain
            function chart() {
                return chart;
            }

            function X(d) {
                return xScale(xValue(d));
            }

            function Y(d) {
                return yScale(yValue(d));
            }

            function renderer () {
            }

            var updateScales = function () {

                // X and Y linear scales to map domain points to document locations
                xScale = d3.scale.linear().domain([0, data[0].length-1]).range([padding, width-padding]);
                yScale = d3.scale.linear().domain([0, data.length-1]).range([padding, height-padding]);

                var lower, upper;

                data.forEach(function (d) {
                    lower = d3.min(d.map(function (x) { return x[0]; }));
                    upper = d3.max(d.map(function (x) { return x[0]; }));
                });

                colours = d3.scale.linear().domain([lower, upper]).range(["yellow", "orange"]);

                cellWidth = xScale(1) / 2;
                cellHeight = yScale(1) / 2;
            };

            var drawAxis = function (svg) {

                svg.append("g").classed("x axis", true)
                    .selectAll("text")
                    .data(d3.range(dimensions.cols))
                    .enter()
                        .append("text")
                        .text(function (d) {
                            return d + 1;
                        })
                        .attr("x", function (d) {
                            var middle = (xScale(d) + xScale(0) / 2);
                            return middle;
                        })
                        .attr("y", padding/1.5);

                svg.append("g").classed("y axis", true).attr("transform", "translate(0, 2)")
                    .selectAll("text")
                    .data(d3.range(dimensions.rows))
                    .enter()
                        .append("text")
                        .text(function (d) {
                            return String.fromCharCode(d + 65);
                        })
                        .attr("x", padding / 1.5)
                        .attr("y", function (d) {
                            return yScale(d) + (cellHeight / 2);
                        });
            };

            var drawKnockouts = function (cellGroup) {

                var filtered = [];
                for (var y = 0; y < data.length; y++) {
                    var row = data[y];
                    for (var x = 0; x < row.length; x++) {
                        if (row[x][1] > 0) {
                            filtered.push({row: y, col: x, value: row[x][0]});
                        }
                    }
                }

                if (filtered.length === 0) return;

                var kos = cellGroup.selectAll(".ko").data(filtered).enter();
                var koGroup = kos.append("g");
                var offset = roundwells ? 5 : 2;

                koGroup.append("line")
                    .classed("ko", true)
                    .attr("x1", function (d, i) { return xScale(d.col) + 5; })
                    .attr("x2", function (d, i) { return xScale(d.col) + cellWidth - offset; })
                    .attr("y1", function (d, i) { return yScale(d.row) + 5; })
                    .attr("y2", function (d, i) { return yScale(d.row) + cellHeight - offset; })
                    .on("click", function () {
                        dispatcher['cell:click'].apply(this, arguments);
                    });

                koGroup.append("line")
                    .classed("ko", true)
                    .attr("x1", function (d, i) { return xScale(d.col) + 5; })
                    .attr("x2", function (d, i) { return xScale(d.col) + cellWidth - offset; })
                    .attr("y1", function (d, i) { return yScale(d.row) + cellHeight - offset; })
                    .attr("y2", function (d, i) { return yScale(d.row) + 5; })
                    .on("click", function () {
                        dispatcher['cell:click'].apply(this, arguments);
                    });
            };

            var drawCells = function (svg) {

                var cellGroup = svg.append("g");

                var row = cellGroup.selectAll(roundwells ? "circle" : "rect")
                    .data(data)
                    .enter()
                        .append("g")
                        .classed("row", true);

                var rowEntry = row.selectAll(".cell")
                    .data(function (d, i) {
                        return d.map(function (a, index) {
                            return { value: a[0], ko: a[1], row: i, col: index};
                        });
                    })
                    .enter();

                var rowGroups = rowEntry.append("g");

                var cell;

                if (roundwells) {
                    cell = rowGroups.append("circle")
                        .classed("cell", true)
                        .attr("cx", function (d, i) {
                            return xScale(i) + (cellWidth / 2);
                        })
                        .attr("cy", function (d, i) {
                            return yScale(d.row) + (cellHeight / 2);
                        })
                        .attr("r", function () {
                            return cellWidth / 2;
                        });
                } else {
                    cell = rowGroups.append("rect")
                        .classed("cell", true)
                        .attr("x", function (d, i) {
                            return xScale(i) + 1;
                        })
                        .attr("y", function (d, i) {
                            return yScale(d.row) + 1;
                        })
                        .attr("width", function () {
                            return cellWidth + 1;
                        })
                        .attr("height", function () {
                            return cellHeight + 1;
                        });
                }

                cell.attr("fill", function (d) {
                    return colours(d.value);
                })
                .on('click', function () {
                    dispatcher['cell:click'].apply(this, arguments);
                })
                .on('mouseover', function () {
                    dispatcher['cell:mouseover'].apply(this, arguments);
                })
                .on('mouseout', function () {
                    dispatcher['cell:mouseout'].apply(this, arguments);
                });

                drawKnockouts(cellGroup);
            };

            chart.highlight = function (cell) {
                d3.select(cell)
                  .attr("stroke-opacity", 0)
                .transition()
                .ease("linear")
                .duration(1200)
                  .attr("class", "highlight")
                  .attr("stroke-opacity", 1)
                  .attr("stroke-width", 3);
                return chart;
            };

            chart.unhighlight = function (cell) {
                d3.select(cell)
                    .transition()
                    .ease("linear")
                    .duration(750)
                      .attr("stroke-opacity", 0)
                    .each("end", function () {
                        // Remove highlight class once cross is invisible
                        d3.select(this)
                            .attr("class", null)
                            .attr("stroke-opacity", null);
                    });
                return chart;
            };

            /**
             * The main render method.
             *
             * @param container The container to append to
             */
            chart.render = function (container) {

                if (container === null)
                    throw new Error("container cannot be null");

                // Create the top level svg element, appended to the parent container
                var svg = container.append("svg")
                              .attr("width", width + (padding * 2))
                              .attr("height", (height+(padding*2)))
                              .attr("class", "heatmap")
                              .append("g");

                updateScales();
                drawCells(svg);
                drawAxis(svg);
            };

            chart.padding = function (value) {
                if (!arguments.length) return padding;
                padding = value;
                return chart;
            };

            chart.dimensions = function (value) {
                if (!arguments.length) return dimensions;
                dimensions = value;
                return chart;
            };

            chart.width = function (value) {
                if (!arguments.length) return width;
                width = value;
                return chart;
            };

            chart.height = function (value) {
                if (!arguments.length) return height;
                height = value;
                return chart;
            };

            chart.data = function (value) {
                if (!arguments.length) return data;
                data = value;
                return chart;
            };

            chart.roundwells = function (value) {
                if (!arguments.length) return roundwells;
                roundwells = !!value;
                return chart;
            };

            chart.on = function (event, func) {
                dispatcher.on(event, func);
                return chart;
            };

            return chart;
        })();
    })();
}));
