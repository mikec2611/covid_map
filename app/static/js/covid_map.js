var mouseX;
var mouseY;
var $active_county = "";
var $active_county_prop = "";
var $selected_county = "";
var $selected_county_prop = "";
var county_chart;
var unique_county_list;

var chartcolor_1 = "orange"
var chartcolor_2 = "forestgreen"

$(document).ready(function($) {
	// console.log(unique_county)
	// console.log(date_list)
	// console.log(geodata_county)
	// console.log(geodata_state)

	//cache commonly used elements
	var $date_slider = $("#date_slider")
	var $slider_info_box = $('#slider_info_box')
	var $tooltip_box = $("#tooltip_box")
	var $tooltip_body = $("#tooltip_body")
	var $legend_box = $('#legend_box')
	var $legend_body = $('#legend_body')
	var $county_info_box = $('#county_info_box')
	var $county_info_body = $('#county_info_body')

	// get dates
	var first_date = date_list[0]
	var last_date = date_list[date_list.length - 1]
	var first_date_sld = new Date(first_date.substring(0,4), first_date.substring(4,6) -1, first_date.substring(6,8))
	var last_date_sld = new Date(last_date.substring(0,4), last_date.substring(4,6) -1, last_date.substring(6,8))
	var first_date_format = format_date(first_date_sld)
	var last_date_format = format_date(last_date_sld)

	// track mouse movement
	$(document).mousemove( function(e) {
	   mouseX = e.pageX; 
	   mouseY = e.pageY;
	});

	// show/hide app info
	$('#btn_info').click(function(){
		$('#app_info_box, #app_shader').show();
		// $('').show();
	});
	$('#ai_close > i').click(function(){
		$('#app_info_box, #app_shader').hide();
		// $('#app_shader').hide();
	});
	// // populate county search
	// var unique_county_list = [];
	// var num_counties = unique_county.length
	// $.each(unique_county, function(county_ind, county_rec){
	// 	unique_county_list.push(county_rec[1]);
	// 	if (county_ind+1 == num_counties){
	// 		// console.log(typeof (unique_county_list.values()))
	// 		$('#cs_input').autocomplete({
	// 			source: unique_county_list
	// 		});
	// 	};
	// });

	// populate dates on ui
	$("#slider_min_box").text(first_date_format)
	$("#slider_max_box").text(last_date_format)
	$("#data_update_val").text(first_date_format.replace(/-/g, ".") + " - " + last_date_format.replace(/-/g, "."))

	// create map
	mapboxgl.accessToken = "pk.eyJ1IjoibWMyNjExIiwiYSI6ImNrOHB6ZWhubDAwMTYza3FnNXZ6bHVpMXAifQ.DlTZdXEIIELPGf0oZmGSPA";
	var map = new mapboxgl.Map({
		container: 'map', // container id
		style: 'mapbox://styles/mapbox/dark-v10', //hosted style id
		center: [-95, 38],
		zoom: 4
	});

	// load map
	map.on('load', function() {
		// add data sources
		map.addSource('us_counties', {
			'type': 'geojson',
			'data': geodata_county
		});
		map.addSource('us_states', {
			'type': 'geojson',
			'data': geodata_state
		});

		// add county layer
		map.addLayer({
			'id': 'us_counties',
			'type': 'fill',
			'source': 'us_counties',
			// 'layout': {},
			'paint': {
				'fill-opacity': ['case',
									['boolean', ['feature-state', 'hover'], false],
				 					0.85,
									0.55
	            				],
				'fill-outline-color': ['case',
										['boolean', ['feature-state', 'clicked'], false],
										 'cyan',
										 'black'
									],
			}
		});
		// add state layer
		map.addLayer({
			'id': 'us_states',
			'type': 'line',
			'source': 'us_states',
			'paint': {
				'line-width': 2.5,
				// 'line-color': "#cccccc",
				'line-color': "black",
				// 'line-dasharray': [2, 2],
			}
		});

		// events when click on layer. show county info
		map.on('click', 'us_counties', function(e) {
			event_shp = e.features[0]
			if ($selected_county.id != event_shp.id){
				// if ($selected_county != ""){
				// 	toggle_highlight_shp($selected_county.id, false)
				// };

				$selected_county = event_shp
				$selected_county_prop = event_shp.properties
				// toggle_highlight_shp(event_shp.id, true)
				show_county_info()
			};
		});

		// events when mouse moves on layer. highlight shape and show tooltip
		map.on('mousemove', 'us_counties', function(e) {
			event_shp = e.features[0]
			if ($active_county.id != event_shp.id){
				if ($active_county != ""){
					toggle_highlight_shp($active_county.id, false)
				};

				$active_county = event_shp
				$active_county_prop = event_shp.properties
				toggle_highlight_shp(event_shp.id, true)
				update_tooltip()
			};
		});

		// events when mouse leaves layer. hide tooltip
		map.on('mouseleave', 'us_counties', function(e) {
			if ($active_county != ""){
				toggle_highlight_shp($active_county.id, false)
			};
			$active_county = ""
			$active_county_prop = ""
			$tooltip_box.hide() 
		});

		// start map
		$('#dataopt_cases, #dataopt_current, #dataopt_current_chart').trigger('change');
		update_map(last_date_sld / 1000);
		$('.control_box').not('#county_info_box, #tooltip_box, #app_info_box').show()
	});

	// create date slider
	var zoom_threshold = 6.5
    $date_slider.slider({
        range: false,
        min: first_date_sld / 1000,
        max: (last_date_sld / 1000)  ,//+ 86400,
        step: 86400,
        value: last_date_sld / 1000,
        slide: function(event, ui) {
        	update_map(ui.value)
        }
    });

    // select new data metric/type for mapping
	$("input.rb_dataopt").change(function(){
		update_map($date_slider.slider("option","value"));

		// color radiobutton choices
		if ($(this).hasClass("rb_dataopt_metric")){
			$("input.rb_dataopt_metric").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
		} else if ($(this).hasClass("rb_dataopt_type")){
			$("input.rb_dataopt_type").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
		};
		$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
	});

	// update the chart
	$("input.rb_dataopt_chart").change(function(){
		update_ci_chart();
		$("input.rb_dataopt_chart").parent().css({'color': 'inherit', 'font-weight': 'inherit'});
		$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
	})

	// close county info box
	$('#ci_close > i').on('click', function(){
		toggle_ci_box(false);
		$selected_county = ""
		$selected_county_prop = ""
	});

	// ---functions

	// update map based on date_slider value
	function update_map(date_val){
		var curr_date = new Date(date_val * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0]
		var curr_datatype_metric = $("input.rb_dataopt_metric:checked").val();
		var curr_datatype_type = $("input.rb_dataopt_type:checked").val();
		if (curr_datatype_type == "daily"){
			var curr_lookup = curr_datatype_metric + "PD_" + curr_date_id.replace(/-/g, "")	;
		} else if (curr_datatype_type == "current"){
			var curr_lookup = curr_datatype_metric + "_" + curr_date_id.replace(/-/g, "");
		};
		var legend_stops = calc_legend_stops(curr_datatype_metric, curr_datatype_type)

		map.setPaintProperty('us_counties', 'fill-color', {
			property: curr_lookup,
			stops: legend_stops
		});
		update_legend(legend_stops)
		$slider_info_box.text(format_date(curr_date));

		// if ($active_county != ""){
		// 	update_tooltip()
		// };
	};

	// calculate which legend stops to use
	function calc_legend_stops(curr_datatype_metric, curr_datatype_type){
		if (curr_datatype_type == "current"){
			if (curr_datatype_metric == "cases"){
				legend_stops = [
					[0, 'darkgray'],
					[10, 'green'],
					[100, 'yellow'],
					[1000, 'darkorange'],
					[10000, 'red']
				];
			} else if (curr_datatype_metric == "deaths") {
				legend_stops = [
					[0, 'darkgray'],
					[1, 'green'],
					[10, 'yellow'],
					[100, 'darkorange'],
					[1000, 'red']
				];
			}
		} else if (curr_datatype_type == "daily"){
			if (curr_datatype_metric == "cases"){
				legend_stops = [
					[0, 'darkgray'],
					[1, 'green'],
					[10, 'yellow'],
					[100, 'darkorange'],
					[1000, 'red']
				];
			} else if (curr_datatype_metric == "deaths") {
				legend_stops = [
					[0, 'darkgray'],
					[1, 'green'],
					[5, 'yellow'],
					[10, 'darkorange'],
					[100, 'red']
				];
			}
		}

		return legend_stops;
	};

	// update legend
	function update_legend(legend_stops){
		$('#legend_data_metric').text("Reported " + $("input.rb_dataopt_metric:checked").val())
		if ($("input.rb_dataopt_type:checked").val() == "daily"){
			$('#legend_data_type').text("(Daily Count)")
		} else{
			$('#legend_data_type').text("(Current Count)")
		}
		
		$("tr.legend_row").remove()

		// spacer row
		append_string = "<tr id='first_legend_row' class='legend_row'><td colspan='2'></tr>"
		$legend_body.append(append_string)

		// no data row
		append_string = "<tr class='legend_row'>"
		append_string = append_string + "<td class='legend_label'>No Data</td>"
		append_string = append_string + "<td class='legend_swatch' style='background-color:#292828'></td>"
		append_string = append_string + "</tr>"
		$legend_body.append(append_string)
		
		// row for each stop
		$.each(legend_stops, function(stop_ind, legend_stop) {
			var range_min = $.number(legend_stop[0])
			if (stop_ind == 0) {
				var range_max = ""
			} else if (stop_ind != legend_stops.length - 1){
				var range_max = " - " + $.number(legend_stops[stop_ind + 1][0])
			} else {
				var range_max = "+";
			};

			append_string = ""
			append_string = "<tr class='legend_row'>"
			append_string = append_string + "<td class='legend_label'>" + range_min + range_max + "</td>"
			append_string = append_string + "<td class='legend_swatch' style='background-color:" + legend_stop[1] + "'></td>"
			append_string = append_string + "</tr>"
			$legend_body.append(append_string)
		});
		$legend_box.show();
	};

	// show info on hovered county
	function update_tooltip(){
		var selected_date = $date_slider.slider("option","value")
		var curr_date = new Date(selected_date * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0].replace(/-/g, "")
		var curr_datatype_metric = $("input.rb_dataopt_metric:checked").val();
		var curr_datatype_type = $("input.rb_dataopt_type:checked").val();
		var county_data = $active_county_prop;

		// get data based on selections
		if (curr_datatype_type == "daily"){
			var type_lookup = "PD_";
			$('#tooltip_header_type').text("Daily Metrics: ")
		} else if (curr_datatype_type == "current"){
			var type_lookup = "_";
			$('#tooltip_header_type').text("Current Metrics: ")
		};

		// update headers
		$('#tooltip_header_name').text(county_data["NAMELSAD"] + ", " + county_data["state_abbr"])
		$('#tooltip_header_date').text(format_date(curr_date))

		// create row for each displayed prop
		var displayed_properties = ["cases" + type_lookup + curr_date_id, "deaths" + type_lookup + curr_date_id]
		var label_display = [" Reported Cases", "Reported Deaths"]
		$("tr.tooltip_data_row").remove()
		$.each(displayed_properties, function(prop_ind, prop) {
			label_text = label_display[prop_ind]

			append_string = ""
			append_string = "<tr class='tooltip_data_row'>"
			append_string = append_string + "<td class='tooltip_data_label'>" + label_text + "</td>"
			append_string = append_string + "<td class='tooltip_data_val'>" + $.number(county_data[prop]) + "</td>"
			append_string = append_string + "</tr>"

			$tooltip_body.append(append_string);
		});

		$tooltip_box.css({'top': mouseY + 10,'left': mouseX + 10}).show();
	};

	// show info on the clicked county
	function show_county_info(){
		update_ci_chart()
		toggle_ci_box(true)
	};

	// update the county info chart
	function update_ci_chart(){
		chart_data = get_chart_data()
		load_chart(chart_data)
	};

	// load the county info chart
	function load_chart(chart_data){
		var county_data = $selected_county_prop;
		var chart_container = $("#county_chart_container")
		
		// destroy existing chart if it exists
		if (typeof(county_chart) != "undefined"){
			county_chart.destroy()
		};

		// var chart_metric = $("input.rb_dataopt_metric_chart:checked").val();
		var chart_type = $("input.rb_dataopt_type_chart:checked").val();
		if (chart_type == "current"){
			var chardata_type = "line";
			chartdata = [{	
				type: chardata_type,
	            label: 'Reported Deaths',
	            data: chart_data[2],
	            yAxisID: 'deaths',
	            borderColor: chartcolor_1,
	            fill: false
	        },
	        {	
	        	type: chardata_type,
	            label: 'Reported Cases',
	            data: chart_data[1],
	            yAxisID: 'cases',
	            borderColor: chartcolor_2,
	            fill: false
	        }]
		} else if (chart_type == "daily"){
			var chardata_type = "bar";
			chartdata = [{		
				type: chardata_type,	     		
	            label: 'Reported Deaths',
	            data: chart_data[4],
	            yAxisID: 'deaths',
	            borderColor: chartcolor_1,
	            backgroundColor: chartcolor_1
	        },
	        {	
	        	type: chardata_type,
	            label: 'Reported Cases',
	            data: chart_data[3],
	            yAxisID: 'cases',
	            borderColor: chartcolor_2,
	            backgroundColor: chartcolor_2
	        }]
		};

		// create chart
		county_chart = new Chart(chart_container, {
			type: chardata_type,
		    data: {
		        labels: chart_data[0],
		        datasets: chartdata
		    },
		    options: {
		        scales: {
		            yAxes: [{
			            		id: 'cases',
			            		position: 'right',
			                	ticks: {
				                    beginAtZero: true,
				                    callback: function(label, index, labels) {
				                        return $.number(label);
				                    },
							        fontColor: "white"
		                		},
		                		scaleLabel: {
							        display: true,
							        labelString: 'Reported Cases',
							        fontColor: "white"
							    },
							    gridLines: {
							    	display:true,
							    	color:"#595959",
							    	lineWidth:0.5
							    }
		                	},
		                	{
			            		id: 'deaths',
			            		position: 'left',
			                	ticks: {
				                    beginAtZero: true,
				                    callback: function(label, index, labels) {
				                        return $.number(label);
				                    },
							        fontColor: "white"
		                		},
		                		scaleLabel: {
							        display: true,
							        labelString: 'Reported Deaths',
							        fontColor: "white"
							    }
		               	}],
               		xAxes: [{
			            		id: 'date',
			                	ticks: {
			                		callback: function(label, index, labels) {
			                			date_val = new Date(label.substring(0,4), label.substring(4,6) -1, label.substring(6,8))
			                			date_val = format_date(date_val).substring(0,8)
				                        return date_val;
				                    },
							        fontColor: "white"
		                		},
		                	}]
		        },
		        title: {
		            display: true,
		            text: county_data["NAMELSAD"] + ", " + county_data["state_name"],
		            fontSize: 24,
		            fontColor: "white"
		        },
		        legend:{
		        	labels:{
		        		fontColor:"white"
		        	},
		        	onHover: (event, chartElement) => {
				    	event.target.style.cursor = 'pointer'
					}
		        },
		        tooltips:{
	        		callbacks: {
	        			title: function(tooltipItem, data){
		           			date_val = tooltipItem[0].xLabel
							date_val = new Date(date_val.substring(0,4), date_val.substring(4,6) -1, date_val.substring(6,8))
            	 			date_val = format_date(date_val).substring(0,8)
            	 			new_tooltip = date_val
            	 			return new_tooltip
	        			},
				        label: function(tooltipItem, data) {
				        	var label = data.datasets[tooltipItem.datasetIndex].label
				            var value = $.number(tooltipItem.value)
				            return label + ": " + value
				    	},
				    	labelColor: function(tooltipItem, chart) {
				    		if (tooltipItem.datasetIndex == 0){
				    			var colors = {
			                        borderColor: chartcolor_1,
			                        backgroundColor: chartcolor_1
			                    };
				    		} else if (tooltipItem.datasetIndex == 1){
								var colors = {
			                        borderColor: chartcolor_2,
			                        backgroundColor: chartcolor_2
			                    };
				    		}
		                    return colors
		                },
                    },
		        },
		        onHover: (event, chartElement) => {
				   	event.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
				}
		    }
		});
	};

	function get_chart_data(){
		var county_data = $selected_county_prop;

		// create array to feed to chart
		var chart_data = [[],[],[],[],[]]
		$.each(date_list, function(date_ind, date_val){

			chart_data[0].push(date_val)

			// current
			if (typeof(county_data["cases_" +date_val]) != "undefined"){
				chart_data[1].push(county_data["cases_" + date_val])
			} else{
				chart_data[1].push(0);
			};

			if (typeof(county_data["deaths_" + date_val]) != "undefined"){
				chart_data[2].push(county_data["deaths_" + date_val])
			} else{
				chart_data[2].push(0)
			};

			// per day
			if (typeof(county_data["casesPD_" +date_val]) != "undefined"){
				chart_data[3].push(county_data["casesPD_" + date_val])
			} else{
				chart_data[3].push(0);
			};
			if (typeof(county_data["deathsPD_" + date_val]) != "undefined"){
				chart_data[4].push(county_data["deathsPD_" + date_val])
			} else{
				chart_data[4].push(0)
			};
			
		});

		return chart_data;
	};

	// hide/show the county info box
	function toggle_ci_box(bool_action){
		if (bool_action == true){
			$county_info_box.show();
		} else {
			$county_info_box.hide();
		};
	};

	// highlight shape
	function toggle_highlight_shp(county_index, bool_active){
		map.setFeatureState({source: 'us_counties', id: county_index}, { hover: bool_active });
	};

	function format_date(raw_date){
		updated_date = new Date((new Date(raw_date) / 1000) * 1000)
		updated_date = updated_date.toISOString().split('T')[0].split("-")
		updated_date = updated_date[1] + "-" + updated_date[2] + "-" + updated_date[0]
		return updated_date
	};

});