$(document).ready(function($) {

	var $slider_info_box = $('#slider_info_box')

	console.log(date_list)

	var first_date = date_list[0]
	var last_date = date_list[date_list.length - 1]

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
				'fill-color': {
						property: 'cases_20200404',
						stops: [
							[0, 'blue'],
							[5, 'red']
						],
				},
				'fill-outline-color': 'black',
				'fill-opacity': 0.8
			}
		});
	});

	// create date slider
	var first_date_sld = first_date.substring(0,4) + "." + first_date.substring(4,6) + "." + first_date.substring(6,8)
	var last_date_sld = last_date.substring(0,4) + "." + last_date.substring(4,6) + "." + last_date.substring(6,8)

	// display dates on ui
	var first_date_format = new Date((new Date(first_date_sld).getTime() / 1000) * 1000)
	var last_date_format = new Date((new Date(last_date_sld).getTime() / 1000) * 1000)
	$slider_info_box.text(last_date_format.toString().substring(0,15));
	$("#slider_min_box").text(first_date_format.toString().substring(0,15))
	$("#slider_max_box").text(last_date_format.toString().substring(0,15))

    $("#date_slider").slider({
        range: false,
        min: new Date(first_date_sld).getTime() / 1000,
        max: new Date(last_date_sld).getTime() / 1000,
        step: 86400,
        value: new Date(last_date_sld).getTime() / 1000
    });

    // update map based on date_slider value
	$("#date_slider").on("slide", function(event, ui) {
		var curr_date = new Date(ui.value * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0]
		var curr_lookup = "cases_" + curr_date_id.replace(/-/g, "")

		map.setPaintProperty('us_counties', 'fill-color', {
			property: curr_lookup,
			stops: [
				[0, 'blue'],
				[5, 'red']
			]
		});

		$slider_info_box.text(curr_date.toString().substring(0,15));
	});



// 	//---------------------------------------------------------------------------------------------------
// 	// When a click event occurs on a feature in the states layer, open a popup at the
// 	// location of the click, with description HTML from its properties.
// 	map.on('click', 'us_counties', function(e) {
// 		console.log($("#date_slider").slider())
// 		var curr_date = new Date($("#date_slider").slider().value * 1000)
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