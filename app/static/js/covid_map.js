var mouseX;
var mouseY;
var $active_county = "";
var $active_county_prop = "";

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

	// create map
	mapboxgl.accessToken = "pk.eyJ1IjoibWMyNjExIiwiYSI6ImNrOHB6ZWhubDAwMTYza3FnNXZ6bHVpMXAifQ.DlTZdXEIIELPGf0oZmGSPA";
	var map = new mapboxgl.Map({
		container: 'map', // container id
		style: 'mapbox://styles/mapbox/dark-v10', //hosted style id
		center: [-95, 38],
		zoom: 4
	});

	// console.log(date_list)
	console.log(geodata_county)

	// get dates
	var first_date = date_list[0]
	var last_date = date_list[date_list.length - 1]
	var first_date_sld = first_date.substring(0,4) + "." + first_date.substring(4,6) + "." + first_date.substring(6,8)
	var last_date_sld = last_date.substring(0,4) + "." + last_date.substring(4,6) + "." + last_date.substring(6,8)

	// populate dates on ui
	var first_date_format = format_date(first_date_sld)
	var last_date_format = format_date(last_date_sld)
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
					 0.8,
					 0.4
	            ],
				'fill-outline-color': ['case',
					['boolean', ['feature-state', 'hover'], false],
					 'black',
					 'black'
	            ],
			}
		});

		map.on('click', 'us_counties', function(e) {

		});

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
		map.on('mouseleave', 'us_counties', function(e) {
			if ($active_county != ""){
				toggle_highlight_shp($active_county.id, false)
			};

			$active_county = ""
			$active_county_prop = ""
			$tooltip_box.hide()
		});

		update_map(new Date(last_date_sld) / 1000);

	});

	// create date slider
	var zoom_threshold = 6.5
    $date_slider.slider({
        range: false,
        min: new Date(first_date_sld) / 1000,
        max: new Date(last_date_sld) / 1000,
        step: 86400,
        value: new Date(last_date_sld) / 1000,
        slide: function(event, ui) {
        	update_map(ui.value)
        }
    });

    // events that update the map
	$("input.rb_dataopt").change(function(){
		update_map($date_slider.slider("option","value"))
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
				[1000, 'red'],
				[10000, 'purple'],
				// [100000, 'pink'],
			];
		} else if (curr_datatype == "deaths") {
			legend_stops = [
				[0, 'darkgray'],
				[1, 'green'],
				[10, 'yellow'],
				[100, 'red'],
				[1000, 'purple'],
				// [10000, 'cyan'],
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

		append_string = ""
		append_string = "<tr class='legend_row'>"
		append_string = append_string + "<td class='legend_label'>No Data</td>"
		append_string = append_string + "<td class='legend_swatch' style='background-color:#292828'></td>"
		append_string = append_string + "</tr>"
		$legend_body.append(append_string)
		
		$.each(legend_stops, function(stop_ind, legend_stop) {
			append_string = ""
			append_string = "<tr class='legend_row'>"
			append_string = append_string + "<td class='legend_label'>" + $.number(legend_stop[0]) + "</td>"
			append_string = append_string + "<td class='legend_swatch' style='background-color:" + legend_stop[1] + "'></td>"
			append_string = append_string + "</tr>"
			$legend_body.append(append_string)
		});
		$legend_box.show();
	}

	// show info on the clicked zip code
	function update_tooltip(){
		var selected_date = $date_slider.slider("option","value")
		var curr_date = new Date(selected_date * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0].replace(/-/g, "")
		// var curr_datatype = $("input.rb_dataopt:checked").val();
		// var curr_lookup = curr_datatype + "_" + curr_date_id

		var zip_data = $active_county_prop;

		// update header
		$('#tooltip_header_name').text(zip_data["NAMELSAD"] + ", " + zip_data["STATEFP"])
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
			append_string = append_string + "<td class='tooltip_data_val'>" + $.number(zip_data[prop]) + "</td>"
			append_string = append_string + "</tr>"

			$tooltip_body.append(append_string)
		});

		$tooltip_box.css({'top': mouseY + 10,'left': mouseX + 10}).show()
	};

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