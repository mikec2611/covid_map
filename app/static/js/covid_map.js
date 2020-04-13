$(document).ready(function($) {
	mapboxgl.accessToken = "pk.eyJ1IjoibWMyNjExIiwiYSI6ImNrOHB6ZWhubDAwMTYza3FnNXZ6bHVpMXAifQ.DlTZdXEIIELPGf0oZmGSPA";
	var map = new mapboxgl.Map({
		container: 'map', // container id
		style: 'mapbox://styles/mapbox/dark-v10', //hosted style id
		center: [-77.38, 39],
		zoom: 3
	});

	console.log(date_list)
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
							[10, 'red']
						],
				},
				'fill-outline-color': 'black',
				'fill-opacity': 0.8
			}
		});
	});

//---------------------------------------------------------------------------------------------------
	// When a click event occurs on a feature in the states layer, open a popup at the
	// location of the click, with description HTML from its properties.
	map.on('click', 'us_counties', function(e) {
		console.log($("#date_slider").slider().value)
		var curr_date = new Date($("#date_slider").slider().value * 1000)
		var curr_date_id = curr_date.toISOString().split('T')[0]
		var curr_lookup = "cases_" + curr_date_id.replace(/-/g, "")

		new mapboxgl.Popup()
			.setLngLat(e.lngLat)
			.setHTML(e.features[0].properties["cases_" + curr_lookup])
			.addTo(map);
	});
	 
	// Change the cursor to a pointer when the mouse is over the states layer.
	map.on('mouseenter', 'us_counties', function() {
		map.getCanvas().style.cursor = 'pointer';
	});
	 
	// Change it back to a pointer when it leaves.
	map.on('mouseleave', 'us_counties', function() {
		map.getCanvas().style.cursor = '';
	});
//---------------------------------------------------------------------------------------------------

	// create date slider
    $("#date_slider").slider({
        range: false,
        min: new Date('2020.04.01').getTime() / 1000,
        max: new Date('2020.04.10').getTime() / 1000,
        step: 86400,
        value: new Date('2020.04.10').getTime() / 1000
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
				[10, 'red']
			]
		})
	});
});