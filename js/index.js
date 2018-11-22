 // reversed engineering from...
// https://bl.ocks.org/mbostock/3306362
// https://beta.observablehq.com/@mbostock/d3-choropleth

// coded in d3 v5

var w = 960;
var h = 670;

var colorbrewer = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];

var format = d3.format(".1f"); // set legend decimal

var tooltip = d3.select("#choromap")
                .append("div")
                .attr("id", "tooltip")
                .style("opacity", 0.0);

var svg = d3.select("#choromap")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

// rendering geographic information
// https://d3indepth.com/geographic/
// video tutorial- https://www.dashingd3js.com/lessons/d3-geo-path
var path = d3.geoPath();


var education_data = "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/for_user_education.json";
var county_data = "https://raw.githubusercontent.com/no-stack-dub-sack/testable-projects-fcc/master/src/data/choropleth_map/counties.json";

// ****d3 v5 no longer use queue *****
// d3 queue         **load geography first!!**
// http://bl.ocks.org/mapsam/6090056
// https://github.com/d3/d3-queue
// d3.queue()  // **geography data must load first!!
//  .defer(d3.json, county_data)
//  .defer(d3.json, education_data)
//  .await(ready)

// d3 v5 promise all replaced d3 queue
// https://stackoverflow.com/questions/49534470/d3-js-v5-promise-all-replaced-d3-queue

var files = [county_data, education_data]; // note the files order

Promise.all(files.map(function (url) {return d3.json(url);})).then(function (values) {
  var usamap = values[0]; // 1st file loaded is map/county
  var education = values[1]; // 2nd file loaded is education



  // Threshold Legend -   https://bl.ocks.org/mbostock/4573883
  var minEdu = d3.min(education, function (d) {return d.bachelorsOrHigher;}); // 2.6
  var maxEdu = d3.max(education, function (d) {return d.bachelorsOrHigher;}); // 75.1


  var threshold = d3.scaleThreshold()
                    .domain(d3.range(minEdu + (maxEdu - minEdu) / 9, maxEdu, (maxEdu - minEdu) / 9)) //equivalent to .domain([11,19,27,35,43,51,59,67])
  // d3.range([start, ]stop[, step])     more info at https://github.com/d3/d3-array
                    .range(colorbrewer);

  var x = d3.scaleLinear()
            .domain([minEdu, maxEdu]) // .domain([2.6, 75.1])
            .range([0, 270]); // legend size/width

  var xAxis = d3.axisBottom(x)
                .tickSize(20) //height of tick divider
                .tickValues(threshold.domain())
  //                .tickFormat((x) => format(x) + "%")   // add %
                .tickFormat(format);


  var g = svg.append("g")
             .attr("transform", "translate(" + (w - 350) + "," + (h - 40) + ")") // legend position
             .attr("id", "legend")
             .call(xAxis);

  g.select(".domain")
   .remove();

  g.selectAll("rect")
   .data(threshold.range().map(function (color) {
     var d = threshold.invertExtent(color);
     if (d[0] == null) d[0] = x.domain()[0];
     if (d[1] == null) d[1] = x.domain()[1];
     return d;
   }))
   .enter()
   .insert("rect", ".tick")
   .attr("height", 15)
   .attr("x", function (d) {return x(d[0]);})
   .attr("width", function (d) {return x(d[1]) - x(d[0]);})
   .attr("fill", function (d) {return threshold(d[0]);});

  // legend desciption
  g.append("text")
   .attr("fill", "purple")
   .attr("font-weight", 700)
   .attr("text-anchor", "start")
   .attr("y", -6)
   .text("Adults age >= 25 years old with bachelor's degree or higher (%)");


  svg.append("g")
     .selectAll("path")
     .data(topojson.feature(usamap, usamap.objects.counties).features)
     .enter()
     .append("path")
     .attr("class", "county")
     .attr("d", path)
     .attr("data-fips", function (d) {
       return d.id;
     })
     .attr("data-education", function (d) {
       var result = education.filter(function (obj) {
         return obj.fips == d.id;
       });
       if (result[0]) {
         return result[0].bachelorsOrHigher;
       } else {
         console.log("no data found for: ", d.id);
         return 0;
       }
     })
  /**********************
     **** ownself method ***
     **********************/
  /*    .attr("fill", function(d) {
                                // first we create a function to return the particular bachelorsOrHigher number for when the counties id is the same as fips
                                    function literacy() {
                                      for (var i = 0; i < education.length; i++) {
                                        if (education[i].fips == d.id) {
                                          return education[i].bachelorsOrHigher;
                                        }
                                      }
                                    }

                                    var result = literacy() // assign the number to result

                                    if(result){   // if true. matching fips id found
                                      return threshold(result)  // return number % as threshold color
                                    }
                                    //could not find a matching fips id in the data
                                    return threshold(0)
                                   })   // keep looping until all the d.id in usamap are evaluated
                              */
  /**********************
  *** official method ***
  **********************/
  // alternate/official method, using filter method to isolate the object (in education json array) whereby fips == usamap id. then return the % value of bachelorsOrHigher key as the color threshold. if no matching fips/ids found, return 0% for color threshold
  // faster computing method
     .attr("fill", function (d) {
       var result = education.filter(function (obj) {
         return obj.fips == d.id;
       });
       if (result[0]) {// if true. matching fips id found
         return threshold(result[0].bachelorsOrHigher);
       }
       //could not find a matching fips id in the data
       return threshold(0);
     })
     .on("mouseover", function (d) {
       tooltip.transition()
              .duration(300)
              .style("opacity", 0.8);
       tooltip.html(function () {
         var result = education.filter(function (obj) {
           return obj.fips == d.id;
         });
         if (result[0]) {
           return result[0].area_name + ", " + result[0].state + "<br/>" + "IQ level: " + result[0].bachelorsOrHigher + "%";
         }
         // no matching fips id
         return "no data found";
       })
          .attr("data-education", function () {
            var result = education.filter(function (obj) {
              return obj.fips == d.id;
            });
            if (result[0]) {
              return result[0].bachelorsOrHigher;
            }
          })
          .style("left", d3.event.pageX + 12 + "px")
          .style("top", d3.event.pageY - 50 + "px");
      })
     .on("mouseout", function (d) {
       tooltip.transition()
              .duration(300)
              .style("opacity", 0);
      });



  // render/draw states border
  svg.append("path")
     .datum(topojson.mesh(usamap, usamap.objects.states, function (a, b) {
       return a.id !== b.id;
     }))
     .attr("class", "states")
     .attr("d", path);


}, function (error) {
  console.log("Error");
});


/*
    useful links
    https://github.com/d3/d3-scale/blob/master/README.md

    https://bl.ocks.org/mbostock/3306362

    https://bl.ocks.org/mbostock/4573883

    https://beta.observablehq.com/@mbostock/d3-choropleth

    https://d3-legend.susielu.com/

    https://github.com/d3/d3-array

    http://colorbrewer2.org/#type=sequential&scheme=Blues&n=9
    */
