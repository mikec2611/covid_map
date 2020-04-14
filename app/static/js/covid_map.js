$(document).ready(function($) {
	//cache commonly used elements
	var $date_slider = $("#date_slider")
	var $slider_info_box = $('#slider_info_box')

	// create map
	mapboxgl.accessToken = "pk.eyJ1IjoibWMyNjExIiwiYSI6ImNrOHB6ZWhubDAwMTYza3FnNXZ6bHVpMXAifQ.DlTZdXEIIELPGf0oZmGSPA";
	var map = new mapboxgl.Map({
		container: 'map', // container id
		style: 'mapbox://styles/mapbox/dark-v10', //hosted style id
		center: [-77.38, 39],
		zoom: 4
	});

	// console.log(date_list)
	console.log(geodata_county)

	// load map
	map.on('load', function() {
		// add data source
		map.addSource('us_counties', {
			'type': 'geojson',
			'data': geodata_county
		});

		// add layer
		map.addLayer({
			'id': 'us_counties',
			'type': 'fill',
			'source': 'us_counties',
			'layout': {},
			'paint': {
				'fill-outline-color': 'black',
				'fill-opacity': 0.8
			}
		});
	});

	// get dates
	var first_date = date_list[0]
	var last_date = date_list[date_list.length - 1]
	var first_date_sld = first_date.substring(0,4) + "." + first_date.substring(4,6) + "." + first_date.substring(6,8)
	var last_date_sld = last_date.substring(0,4) + "." + last_date.substring(4,6) + "." + last_date.substring(6,8)

	// populate dates on ui
	var first_date_format = new Date((new Date(first_date_sld).getTime() / 1000) * 1000)
	var last_date_format = new Date((new Date(last_date_sld).getTime() / 1000) * 1000)
	$("#slider_min_box").text(first_date_format.toString().substring(0,15))
	$("#slider_max_box").text(last_date_format.toString().substring(0,15))

	// create date slider
    $date_slider.slider({
        range: false,
        min: new Date(first_date_sld).getTime() / 1000,
        max: new Date(last_date_sld).getTime() / 1000,
        step: 86400,
        value: new Date(last_date_sld).getTime() / 1000
    });

    // events that update the map
	$date_slider.on("slide", function(event, ui) { 
		update_map(ui.value)
	});
	$("input.rb_dataopt").change(function(){
		update_map($date_slider.slider("option","value"))
	});



	
	initialize_map()
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

		$slider_info_box.text(curr_date.toString().substring(0,15));
	};

	// calculate which legend stops to use
	function calc_legend_stops(curr_datatype){
		if (curr_datatype != "deathsPercCases"){ // non-percentage datatypes
			legend_stops = [
				[0, 'gray'],
				[5, 'green']
			];
		} else{ // percentage datatypes
			legend_stops = [
				[0, 'gray'],
				[100, 'red']
			];
		};

		return legend_stops;
	};

	// initialize map
	function initialize_map(){
		setTimeout(function(){
			update_map(new Date(last_date_sld).getTime() / 1000);	
			alert("A")
		}, 1000);
	};

// 	//---------------------------------------------------------------------------------------------------
// 	// When a click event occurs on a feature in the states layer, open a popup at the
// 	// location of the click, with description HTML from its properties.
// 	map.on('click', 'us_counties', function(e) {
// 		console.log($date_slider.slider())
// 		var curr_date = new Date($date_slider.slider().value * 1000)
// 		var curr_date_id = curr_date.toISOString().split('T')[0]
// 		var curr_lookup = "cases_" + curr_date_id.replace(/-/g, "")

// 		new mapboxgl.Popup()
// 			.setLngLat(e.lngLat)
// 			.setHTML(e.features[0].properties["cases_" + curr_lookup])
// 			.addTo(map);
// 	});
	 
// 	// Change the cursor to a pointer when the mouse is over the states layer.
// 	map.on('mouseenter', 'us_counties', function() {
// 		map.getCanvas().style.cursor = 'pointer';
// 	});
	 
// 	// Change it back to a pointer when it leaves.
// 	map.on('mouseleave', 'us_counties', function() {
// 		map.getCanvas().style.cursor = '';
// 	});
// //---------------------------------------------------------------------------------------------------
});