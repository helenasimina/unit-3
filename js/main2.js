(function () {

	//pseudo-global variables
	var attrArray = ["mean_totin", "mean_cars", "mean_cars", "sum_carshz", "mean_trkdm", "Point_Coun", "Percent Below Poverty Line", "Total Population", "White-Alone", "Black-Alone"]; // List of attributes to join from CSV
	var expressed = attrArray[5]; //initial attribute

	window.onload = setMap();

	//set up choropleth map
	function setMap() {
		//map frame dimensions
		var width = window.innerWidth * 0.5,
			height = 500;

		//create new svg container for the map
		var map = d3.select("body")
			.append("svg")
			.attr("class", "map")
			.attr("width", width)
			.attr("height", height);

		//create Albers equal area conic projection centered on France
		var projection = d3.geoAlbers()
			.center([-8.5, 44.8])
			.rotate([81, 0, 0])
			.parallels([25.20, 45.5])
			.scale(3200.60)
			.translate([width / 2, height / 2]);

		var path = d3.geoPath()
			.projection(projection);

		//use Promise.all to parallelize asynchronous data loading
		var promises = [];
		promises.push(d3.csv("data/tractdatawtrains.csv")); //load attributes from csv    
		promises.push(d3.json("data/nodatatracts.topojson")); //load background spatial data    
		promises.push(d3.json("data/traintrackswi.topojson")); //load choropleth spatial data
		promises.push(d3.json("data/US_State_Boundaries.topojson")); //load choropleth spatial data    
		Promise.all(promises).then(callback);

		function callback(data) {
			csvData = data[0];
			wisconsintracts = data[1];
			USBoundaries = data[3]
			railroads = data[2];


			// Iterate over each feature in the TopoJSON data
			wisconsintracts.objects.nodatatracts.geometries.forEach(function (tract) {
				// Find the corresponding entry in the CSV data based on GEOID
				var csvTract = csvData.find(function (csvEntry) {
					return csvEntry.GEOID === tract.properties.GEOID;
				});

				// If a matching entry is found, add the attributes to the TopoJSON properties
				if (csvTract) {
					attrArray.forEach(function (attr) {
						var val = parseFloat(csvTract[attr]); // Get the attribute value from CSV
						tract.properties[attr] = val; // Add the attribute to TopoJSON properties
					});
				}
			});

			console.log(csvData);
			console.log(wisconsintracts);
			console.log(railroads);
			//translate europe TopoJSON
			var Wisconsin = topojson.feature(wisconsintracts, wisconsintracts.objects.nodatatracts).features,////
				RailTrain = topojson.feature(railroads, railroads.objects.traintrackswi)
				Boundaries = topojson.feature(USBoundaries, USBoundaries.objects.US_State_Boundaries);
			//add Europe countries to map

			// Add Wisconsin tracts to map with fill color
			// var witracts = map.selectAll(".witracts") ////
			// 	.data(Wisconsin.features)
			// 	.enter()
			// 	.append("path")
			// 	.attr("class", "witracts")
			// 	.attr("d", path);


			colorScale = makeColorScale(Wisconsin);////

			var USBoundaries = map.selectAll(".USBoundaries")
				.data(Boundaries.features)
				.enter()
				.append("path")
				.attr("class", "USBoundaries")
				.attr("d", path);

			//add France regions to map
			var railtracks = map.selectAll(".railtracks")
				.data(RailTrain.features)
				.enter()
				.append("path")
				.attr("class", "railtracks")
				.attr("d", path);

			// Call the makeColorScale function with the data array
			var colorScale = makeColorScale(Wisconsin);////

			// Call the setEnumerationUnits function
			setEnumerationUnits(Wisconsin, map, path, colorScale);////
			setChart(csvData, colorScale);
		}
	};

	//function to create color scale generator
	function makeColorScale(witractsData) {
		var colorClasses = [
			"#D4B9DA",
			"#C994C7",
			"#DF65B0",
			"#DD1C77",
			"#980043"
		];


		//create color scale generator
		var colorScale = d3.scaleThreshold()
			.range(colorClasses);

		//build array of all values of the expressed attribute
		var domainArray = [];
		witractsData.forEach(function (d) {
			var val = parseFloat(d.properties[expressed]);
			domainArray.push(val);
			console.log("Pushed value:", val); // Log the value being pushed into the domainArray
		});

		// Log the domainArray before clustering
		console.log("Domain array before clustering:", domainArray);

		//cluster data using ckmeans clustering algorithm to create natural breaks
		var clusters = ss.ckmeans(domainArray, 5);
		//reset domain array to cluster minimums
		domainArray = clusters.map(function (d) {
			return d3.min(d);
		});
		//remove first value from domain array to create class breakpoints
		domainArray.shift();

		// Log the domainArray after clustering
		console.log("Domain array after clustering:", domainArray);

		//assign array of last 4 cluster minimums as domain
		colorScale.domain(domainArray);

		// Log the final domain set for the color scale
		console.log("Color scale domain:", colorScale.domain());

		return colorScale;
	};

	function setEnumerationUnits(wisconsintracts, map, path, colorScale) {
		//add wi tracts to map   

		var newunit = map.selectAll(".witracts")
			.data(wisconsintracts)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "witracts " + d.properties.GEOID;
			})
			.attr("d", path)
			.style("fill", function (d) {
				var value = d.properties[expressed];
				if (value) {
					return colorScale(d.properties[expressed]);
				} else {
					return "#ccc";
				}
			});
		console.log("Census tracts appended to map:", newunit); // Check if census tracts are appended
	}
	function setChart(csvData, colorScale) {
		//chart frame dimensions
		var chartWidth = window.innerWidth * 0.405,
			chartHeight = 500;
		
		// Filter the data to exclude points with zero values
		var filteredData = csvData.filter(function(d) {
			return d.Point_Coun > 0; // Adjust this condition based on your data structure
		});
	
		// Sort the filtered data array based on the expressed attribute
		filteredData.sort(function(a, b) {
			// Check if either 'a' or 'b' is zero
			if (a[expressed] === 0 && b[expressed] === 0) {
				// If both 'a' and 'b' are zero, maintain their relative order
				return 0;
			} else if (a[expressed] === 0) {
				// If 'a' is zero and 'b' is not, move 'a' to the end of the sorted array
				return 1;
			} else if (b[expressed] === 0) {
				// If 'b' is zero and 'a' is not, move 'b' to the end of the sorted array
				return -1;
			} else {
				// If neither 'a' nor 'b' is zero, sort based on their numeric values
				return a[expressed] - b[expressed];
			}
		});
	
		// Create a linear scale for the y-axis
		var yScale = d3.scaleLinear()
			.range([chartHeight, 0]) // Note the reversed range to position bars from top to bottom
			.domain([0, d3.max(filteredData, function(d) { return parseFloat(d[expressed]); })]);
	
		// Create the chart SVG element
		var chart = d3.select("body")
			.append("svg")
			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("class", "chart");
	
		// Append bars to the chart
		var bars = chart.selectAll(".bars")
			.data(filteredData)
			.enter()
			.append("rect")
			.attr("class", function(d) {
				return "bars " + d.GEOID;
			})
			.attr("width", Math.max(chartWidth / filteredData.length - 1, 0))
			.attr("x", function(d, i) {
				return i * (chartWidth / filteredData.length);
			})
			.attr("height", function(d) {
				return chartHeight - yScale(parseFloat(d[expressed]));
			})
			.attr("y", function(d) {
				return yScale(parseFloat(d[expressed])); // Adjusted to use yScale for positioning
			})
			.style("fill", function(d) {
				return colorScale(d[expressed]);
			});
		
		var uniqueData = filteredData.filter(function(d, i, self) {
				return i === self.findIndex(function(t) {
					return t[expressed] === d[expressed];
				});
			});

		var averageX = {};
		
		uniqueData.forEach(function(d) {
				var height = parseFloat(d[expressed]);
				if (!averageX[height]) {
					averageX[height] = [];
				}
				averageX[height].push(filteredData.indexOf(d) * (chartWidth / filteredData.length));
			});
			for (var height in averageX) {
				averageX[height] = averageX[height].reduce((a, b) => a + b, 0) / averageX[height].length;
			}
			
			// Append numbers to the top of each bar using unique data and the calculated average x-position

		
		var numbers = chart.selectAll(".numbers")
			.data(uniqueData)
			.enter()
			.append("text")
			.attr("class", function(d) {
				return "numbers " + d.GEOID;
			})
			.attr("text-anchor", "middle")
			.attr("x", function(d) {
				return averageX[parseFloat(d[expressed])];
			})
			.attr("y", function(d) {
				return yScale(parseFloat(d[expressed])) - 5; // Adjusted positioning to place the numbers slightly above the bars
			})
			.text(function(d) {
				return d[expressed];
			});
		
		
		
		var chartTitle = chart.append("text")
			.attr("x", 20)
			.attr("y", 40)
			.attr("class", "chartTitle")
			.text("Total Train Derailments per Census Tract in 2020");
	}
	

})();

