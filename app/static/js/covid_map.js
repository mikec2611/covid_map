var mouseX;
var mouseY;
var $active_county = "";
var $active_county_prop = "";
var $selected_county = "";
var $selected_county_prop = "";

$(document).ready(function($) {
	$(document).mousemove( function(e) {
	   mouseX = e.pageX; 
	   mouseY = e.pageY;
	});  

	//cache commonly used elements
	var $date_slider = $("#date_slider")
	var $slider_info_box = $('#slider_info_box')
	var $tooltip_box = $("#tooltip_box")
	var $tooltip_body = $("#tooltip_body")
	var $legend_box = $('#legend_box')
	var $legend_body = $('#legend_body')
	var $county_info_box = $('#county_info_box')
	var $county_info_body = $('#county_info_body')

	// create map
	mapboxgl.accessToken = "pk.eyJ1IjoibWMyNjExIiwiYSI6ImNrOHB6ZWhubDAwMTYza3FnNXZ6bHVpMXAifQ.DlTZdXEIIELPGf0oZmGSPA";
	var map = new mapboxgl.Map({
		container: 'map', // container id
		style: 'mapbox://styles/mapbox/dark-v10', //hosted style id
		center: [-95, 38],
		zoom: 4
	});

	console.log(date_list)
	console.log(geodata_county)

	// get dates
	var first_date = date_list[0]
	var last_date = date_list[date_list.length - 1]

	var first_date_sld = new Date(first_date.substring(0,4), first_date.substring(4,6) -1, first_date.substring(6,8))
	var last_date_sld = new Date(last_date.substring(0,4), last_date.substring(4,6) -1, last_date.substring(6,8))
	// var first_date_sld = first_date.substring(0,4) + "." + first_date.substring(4,6) + "." + first_date.substring(6,8)
	// var last_date_sld = last_date.substring(0,4) + "." + last_date.substring(4,6) + "." + last_date.substring(6,8)
	var first_date_format = format_date(first_date_sld)
	var last_date_format = format_date(last_date_sld)
	// var first_date_val = new Date(first_date_sld) / 1000
	// var last_date_val = new Date(last_date_sld) / 1000
	// console.log(first_date_format)

	// populate dates on ui
	$("#slider_min_box").text(first_date_format)
	$("#slider_max_box").text(last_date_format)
	$("#data_update_val").text(first_date_format.replace(/-/g, ".") + " - " + last_date_format.replace(/-/g, "."))

	// load map
	map.on('load', function() {
		
		// add data source
		map.addSource('us_counties', {
			'type': 'geojson',
			'data': geodata_county
		});

		// add default layer
		map.addLayer({
			'id': 'us_counties',
			'type': 'fill',
			'source': 'us_counties',
			'layout': {},
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

		// events when click on layer. show county info
		map.on('click', 'us_counties', function(e) {
			event_shp = e.features[0]
			if ($selected_county.id != event_shp.id){
				if ($selected_county != ""){
					toggle_highlight_shp($selected_county.id, false)
				};

				$selected_county = event_shp
				$selected_county_prop = event_shp.properties
				toggle_highlight_shp(event_shp.id, true)
				show_county_info()
			};
		});

		// events when mouse moves on layer. highlight shape and show tooltip
		map.on('mousemove', 'us_counties', function(e) {
			event_shp = e.features[0]
			if ($active_county.id != event_shp.id){
				$active_county = event_shp
				$active_county_prop = event_shp.properties
				update_tooltip()
			};
		});

		// events when mouse leaves layer. hide tooltip
		map.on('mouseleave', 'us_counties', function(e) {
			$active_county = ""
			$active_county_prop = ""
			$tooltip_box.hide()
		});

		// start map
		update_map(last_date_sld / 1000);
	});

	// create date slider
	var zoom_threshold = 6.5
    $date_slider.slider({
        range: false,
        min: first_date_sld / 1000,
        max: (last_date_sld / 1000)  + 86400,
        step: 86400,
        value: last_date_sld / 1000,
        slide: function(event, ui) {
        	console.log(new Date (ui.value * 1000))
        	update_map(ui.value)
        }
    });

    // events that update the map
	$("input.rb_dataopt").change(function(){
		update_map($date_slider.slider("option","value"))
	});

	// close county info box
	$('#ci_close > i').on('click', function(){
		toggle_ci_box(false)
	});

	// ---functions

	// update map based on date_slider value
	function update_map(date_val){
		var curr_date = new Date(date_val * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0]
		var curr_datatype = $("input.rb_dataopt:checked").val();
		var curr_lookup = curr_datatype + "_" + curr_date_id.replace(/-/g, "")
		var legend_stops = calc_legend_stops(curr_datatype)

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
	function calc_legend_stops(curr_datatype){
		if (curr_datatype == "cases"){
			legend_stops = [
				[0, 'darkgray'],
				[10, 'green'],
				[100, 'yellow'],
				[1000, 'darkorange'],
				[10000, 'red']
			];
		} else if (curr_datatype == "deaths") {
			legend_stops = [
				[0, 'darkgray'],
				[1, 'green'],
				[10, 'yellow'],
				[100, 'darkorange'],
				[1000, 'red']
			];
		} else {
			legend_stops = [
				[0, 'gray'],
				[100, 'orange']
			];
		}

		return legend_stops;
	};

	// update legend
	function update_legend(legend_stops){
		$('#legend_data_type').text($("input.rb_dataopt:checked").val())
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
		var county_data = $active_county_prop;

		// update header
		$('#tooltip_header_name').text(county_data["NAMELSAD"] + ", " + county_data["STATEFP"])
		$('#tooltip_header_date').text(format_date(curr_date))

		// create row for each displayed prop
		var displayed_properties = ["cases_" + curr_date_id, "deaths_" + curr_date_id]
		var label_display = ["Cases", "Deaths"]
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

		var county_chart = new Chart(chart_container, {
		    type: 'bar',
		    data: {
		        labels: chart_data[0],
		        datasets: [
			        {
			            label: 'Cases',
			            data: chart_data[1],
			            borderColor:"green",
			            backgroundColor:"green"
			        },
			     	{
			            label: 'Deaths',
			            data: chart_data[2],
			            borderColor:"red",
			            backgroundColor:"red"
			        },
		        ]
		    },
		    options: {
		        scales: {
		            yAxes: [{
		                ticks: {
		                    beginAtZero: true
		                }
		            }]
		        },
		        title: {
		            display: true,
		            text: county_data["NAMELSAD"] + ", " + county_data["STATEFP"]
		        }
		    }
		});
	};

	function get_chart_data(){
		var county_data = $selected_county_prop;

		// create array to feed to chart
		var chart_data = [[],[],[]]
		$.each(date_list, function(date_ind, date_val){

			chart_data[0].push(date_val)

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