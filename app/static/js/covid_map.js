var mouseX;
var mouseY;
var $active_county = "";
var $active_county_prop = "";
var $selected_county = "";
var $selected_county_prop = "";
var $active_state = "";
var $active_state_prop = "";
var $selected_state = "";
var $selected_state_prop = "";
var county_chart;
var total_chart;
var unique_county_list;
var timeout;

var chartcolor_1 = "orange"
var chartcolor_2 = "forestgreen"

$(window).on('resize', function(){
	if ($(window).height() < 850){
		$('#total_info_box').removeClass('tib_width_largescreen').addClass('tib_width_smallscreen')
	} else {
		$('#total_info_box').addClass('tib_width_largescreen').removeClass('tib_width_smallscreen')
	}
})

$(document).ready(function($) {

	//cache commonly used elements
	var $date_slider = $("#date_slider")
	var $slider_info_box = $('#slider_info_box')
	var $tooltip_box = $("#tooltip_box")
	var $tooltip_body = $("#tooltip_body")
	var $legend_box = $('#legend_box')
	var $legend_body = $('#legend_body')
	var $county_info_box = $('#county_info_box')
	var $county_info_body = $('#county_info_body')

	$('#loading_bar').progressbar({value: 0})
	$('#load_progress').text("0%")

	var load_idx = 0;
	function load_progress(){
			load_idx= load_idx + 5
			setTimeout(function() {
				$('#loading_bar').progressbar({value: load_idx})
				$('#load_progress').text(load_idx + "%")
				if (load_idx < 95){
					load_progress();
				};
			}, load_idx * 10);
	};

	$.ajax({
			type : "POST",
			url : '/get_data',
			dataType: "json",
			contentType: 'application/json;charset=UTF-8',
			xhr: function() {
				load_progress()
		        var xhr = new window.XMLHttpRequest();

				// download progress
				xhr.addEventListener("progress", function(evt){
					if (evt.lengthComputable) {
						var load_perc = Math.round(evt.loaded / evt.total * 100);
						if (load_perc == 100){
							$('#loading_bar').progressbar("option", "value", 100);
							$('#load_progress').text("100%");
						};
					};
				});

		       return xhr;
		    },
			success: function (data) {
				geodata_county = data[0]
				geodata_county_pop = data[1]
				geodata_state = data[2]
				geodata_state_pop = data[3]
				date_list = data[4]
				unique_county = data[5]
				data_total = data[6]
				// console.log(geodata_county);
				// console.log(geodata_county_pop);
				// console.log(geodata_state);
				// console.log(geodata_state_pop);
				// console.log(date_list);
				// console.log(unique_county);
				// console.log(data_total);

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

				if ($(window).height() < 850){
					$('#total_info_box').removeClass('tib_width_largescreen').addClass('tib_width_smallscreen')
				} else {
					$('#total_info_box').addClass('tib_width_largescreen').removeClass('tib_width_smallscreen')
				}

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
					map.addSource('us_counties_pop', {
						'type': 'geojson',
						'data': geodata_county_pop
					});

					map.addSource('us_states', {
						'type': 'geojson',
						'data': geodata_state
					});
					map.addSource('us_states_pop', {
						'type': 'geojson',
						'data': geodata_state_pop
					});


					// add county layer
					map.addLayer({
						'id': 'us_counties_fill',
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
					// add county_pop fill layer
					map.addLayer({
						'id': 'us_counties_pop_fill',
						'type': 'fill',
						'source': 'us_counties_pop',
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

					// add state fill layer
					map.addLayer({
						'id': 'us_states_fill',
						'type': 'fill',
						'source': 'us_states',
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
					// add state_pop fill layer
					map.addLayer({
						'id': 'us_states_pop_fill',
						'type': 'fill',
						'source': 'us_states_pop',
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

					// add state line layer
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

					// events when click on county layers
					map.on('click', 'us_counties_fill', function(e) {
						event_shp = e.features[0]
						if ($selected_county.id != event_shp.id){
							// if ($selected_county != ""){
							// 	toggle_highlight_shp($selected_county.id, false)
							// };

							$selected_county = event_shp
							$selected_county_prop = event_shp.properties
							// toggle_highlight_shp(event_shp.id, true)
							show_county_info('county')
						};
					});
					map.on('click', 'us_counties_pop_fill', function(e) {
						event_shp = e.features[0]
						if ($selected_county.id != event_shp.id){
							// if ($selected_county != ""){
							// 	toggle_highlight_shp($selected_county.id, false)
							// };

							$selected_county = event_shp
							$selected_county_prop = event_shp.properties
							// toggle_highlight_shp(event_shp.id, true)
							show_county_info('county')
						};
					});

					// events when click on state layers
					map.on('click', 'us_states_fill', function(e) {
						event_shp = e.features[0]
						if ($selected_state.id != event_shp.id){
							// if ($selected_county != ""){
							// 	toggle_highlight_shp($selected_county.id, false)
							// };

							$selected_state = event_shp
							$selected_state_prop = event_shp.properties
							// toggle_highlight_shp(event_shp.id, true)
							show_county_info('state')
						};
					});
					map.on('click', 'us_states_pop_fill', function(e) {
						event_shp = e.features[0]
						if ($selected_state.id != event_shp.id){
							// if ($selected_county != ""){
							// 	toggle_highlight_shp($selected_county.id, false)
							// };

							$selected_state = event_shp
							$selected_state_prop = event_shp.properties
							// toggle_highlight_shp(event_shp.id, true)
							show_county_info('state')
						};
					});

					// events when mouse moves on county layers
					map.on('mousemove', 'us_counties_fill', function(e) {
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
					map.on('mousemove', 'us_counties_pop_fill', function(e) {
						event_shp = e.features[0]
						if ($active_county.id != event_shp.id){
							if ($active_county != ""){
								toggle_highlight_shp_pop($active_county.id, false)
							};

							$active_county = event_shp
							$active_county_prop = event_shp.properties
							toggle_highlight_shp_pop(event_shp.id, true)
							update_tooltip()
						};
					});

					// events when mouse leaves county layers
					map.on('mouseleave', 'us_counties_fill', function(e) {
						if ($active_county != ""){
							toggle_highlight_shp($active_county.id, false)
						};
						$active_county = ""
						$active_county_prop = ""
						$tooltip_box.hide() 
					});
					map.on('mouseleave', 'us_counties_pop_fill', function(e) {
						if ($active_county != ""){
							toggle_highlight_shp_pop($active_county.id, false)
						};
						$active_county = ""
						$active_county_prop = ""
						$tooltip_box.hide() 
					});

					// events when mouse moves on states layers
					map.on('mousemove', 'us_states_fill', function(e) {
						event_shp = e.features[0]
						if ($active_state.id != event_shp.id){
							if ($active_state != ""){
								toggle_highlight_shp_st($active_state.id, false)
							};

							$active_state = event_shp
							$active_state_prop = event_shp.properties
							toggle_highlight_shp_st(event_shp.id, true)
							update_tooltip()
						};
					});
					map.on('mousemove', 'us_states_pop_fill', function(e) {
						event_shp = e.features[0]
						if ($active_state.id != event_shp.id){
							if ($active_state != ""){
								toggle_highlight_shp_st_pop($active_state.id, false)
							};

							$active_state = event_shp
							$active_state_prop = event_shp.properties
							toggle_highlight_shp_st_pop(event_shp.id, true)
							update_tooltip()
						};
					});

					// events when mouse leaves us_states_fill layer. hide tooltip
					map.on('mouseleave', 'us_states_fill', function(e) {
						if ($active_state != ""){
							toggle_highlight_shp_st($active_state.id, false)
						};
						$active_state = ""
						$active_state_prop = ""
						$tooltip_box.hide() 
					});
					map.on('mouseleave', 'us_states_pop_fill', function(e) {
						if ($active_state != ""){
							toggle_highlight_shp_st_pop($active_state.id, false)
						};
						$active_state = ""
						$active_state_prop = ""
						$tooltip_box.hide() 
					});
					
					// start app
					$('#loading_screen').hide();
					$('#data_update, #btn_info').show()
					$('#dataoptall_cases, #dataoptall_current, #dataoptall_daily_chart, #dataoptall_cases_chart, #data_level_state, #data_level_pop').trigger('change');
					$('#dataopt_cases, #dataopt_daily, #dataopt_daily_chart, #dataopt_cases_chart').trigger('change');
					update_map(last_date_sld / 1000);
					$('.control_box').not('#county_info_box, #tooltip_box, #app_info_box').show()
				});

				// create date slider
				var zoom_threshold = 6.5;
			    $date_slider.slider({
			        range: false,
			        min: first_date_sld / 1000,
			        max: (last_date_sld / 1000)  ,//+ 86400,
			        step: 86400,
			        value: last_date_sld / 1000,
			        slide: function(event, ui) {
			        	clearTimeout(timeout);
					    timeout = setTimeout(function() {
					        update_map(ui.value)
					    }, 100);
			        }//,
			        // change: function(event, ui){
			        // 	update_map(ui.value)
			        // }
			    });

			    // select new data metric/type for total mapping
				$("input.rb_dataoptall").change(function(){
					update_ti_map($date_slider.slider("option","value"));

					// color radiobutton choices
					if ($(this).hasClass("rb_dataoptall_metric")){
						$("input.rb_dataoptall_metric").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
					} else if ($(this).hasClass("rb_dataoptall_type")){
						$("input.rb_dataoptall_type").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
					};
					$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
				});

				// update the total chart
				$("input.rb_dataoptall_type_chart").change(function(){
					update_ti_chart();
					$("input.rb_dataoptall_type_chart").parent().css({'color': 'inherit', 'font-weight': 'inherit'});
					$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
				})
				$("input.rb_dataoptall_metric_chart").change(function(){
					update_ti_chart();
					$("input.rb_dataoptall_metric_chart").parent().css({'color': 'inherit', 'font-weight': 'inherit'});
					$(this).parent().css({'color': 'greenyellow', 'font-weight': 'bold'});
				})

				// close total info box
				$('#ti_close > i').on('click', function(){
					toggle_ti_box(false);
				});
				$('#ti_open > i').on('click', function(){
					toggle_ti_box(true);
				});

			    // select new data metric/type for county mapping
				$("input.rb_dataopt").change(function(){
					update_map($date_slider.slider("option","value"));

					// color radiobutton choices
					if ($(this).hasClass("rb_dataopt_metric")){
						$("input.rb_dataopt_metric").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
						$(this).parent().css({'color': 'greenyellow', 'font-weight': 'bold'});
					} else if ($(this).hasClass("rb_dataopt_type")){
						$("input.rb_dataopt_type").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
						$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
					};
				});

				// update the county chart
				$("input.rb_dataopt_type_chart").change(function(){
					var curr_data_level = $("input.rb_data_level:checked").val();
					update_ci_chart(curr_data_level);
					$("input.rb_dataopt_type_chart").parent().css({'color': 'inherit', 'font-weight': 'inherit'});
					$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});
				})
				$("input.rb_dataopt_metric_chart").change(function(){
					var curr_data_level = $("input.rb_data_level:checked").val();
					update_ci_chart(curr_data_level);
					$("input.rb_dataopt_metric_chart").parent().css({'color': 'inherit', 'font-weight': 'inherit'});
					$(this).parent().css({'color': 'greenyellow', 'font-weight': 'bold'});
				})

				// close county info box
				$('#ci_close > i').on('click', function(){
					toggle_ci_box(false);
					$selected_county = ""
					$selected_county_prop = ""
				});

				// toggle between county and state view
				$("input.rb_data_level").change(function(){
					update_map($date_slider.slider("option","value"));
					toggle_ci_box(false);

					// color radiobutton choices
					$("input.rb_data_level").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
					$(this).parent().css({'color': 'orange', 'font-weight': 'bold'});

					$selected_state = ""
					$selected_state_prop = ""
					$selected_county = ""
					$selected_county_prop = ""
				});
				// toggle between base and per X persons view
				$("input.rb_data_pop_level").change(function(){
					update_map($date_slider.slider("option","value"));
					toggle_ci_box(false);

					// color radiobutton choices
					$("input.rb_data_pop_level").parent().css({'color': 'inherit', 'font-weight': 'inherit'})
					$(this).parent().css({'color': 'greenyellow', 'font-weight': 'bold'});

					$selected_state = ""
					$selected_state_prop = ""
					$selected_county = ""
					$selected_county_prop = ""
				});

				// play history
				$('#history_btn_container, #history_btn').on('click', function(){
					play_history(true);
				});

				// ---functions
	
				// update county map based on date_slider value
				function update_map(date_val){
					var curr_date = new Date(date_val * 1000)
					var curr_date_id = curr_date.toISOString().split('T')[0]
					var curr_datatype_metric = $("input.rb_dataopt_metric:checked").val();
					var curr_datatype_type = $("input.rb_dataopt_type:checked").val();
					var curr_data_level = $("input.rb_data_level:checked").val();
					var curr_data_pop_level = $("input.rb_data_pop_level:checked").val();
					if (curr_datatype_type == "daily"){
						var curr_lookup = curr_datatype_metric + "PD_" + curr_date_id.replace(/-/g, "")	;
					} else if (curr_datatype_type == "current"){
						var curr_lookup = curr_datatype_metric + "_" + curr_date_id.replace(/-/g, "");
					};
					var legend_stops = calc_legend_stops(curr_datatype_metric, curr_datatype_type, curr_data_level, curr_data_pop_level)

					// curr_lookup = curr_datatype_metric + "_decile_" + curr_date_id.replace(/-/g, "");
					// legend_stops = [
					// 			[0, 'darkgray'],
					// 			[3, 'green'],
					// 			[5, 'yellow'],
					// 			[7, 'darkorange'],
					// 			[10, 'red']
					// 		];

					if (curr_data_level == "county"){
						if (curr_data_pop_level == "base"){
							map.setPaintProperty('us_counties_fill', 'fill-color', {
								property: curr_lookup,
								stops: legend_stops
							});
							map.setLayoutProperty('us_counties_fill', 'visibility', 'visible');
							map.setLayoutProperty('us_counties_pop_fill', 'visibility', 'none');
							map.setLayoutProperty('us_states_fill', 'visibility', 'none');
							map.setLayoutProperty('us_states_pop_fill', 'visibility', 'none');
						} else if (curr_data_pop_level == "population"){
							map.setPaintProperty('us_counties_pop_fill', 'fill-color', {
								property: curr_lookup,
								stops: legend_stops
							});
							map.setLayoutProperty('us_counties_fill', 'visibility', 'none');
							map.setLayoutProperty('us_counties_pop_fill', 'visibility', 'visible');
							map.setLayoutProperty('us_states_fill', 'visibility', 'none');
							map.setLayoutProperty('us_states_pop_fill', 'visibility', 'none');
						}
					} else if (curr_data_level == "state"){
						if (curr_data_pop_level == "base"){
							map.setPaintProperty('us_states_fill', 'fill-color', {
								property: curr_lookup,
								stops: legend_stops
							});
							map.setLayoutProperty('us_states_fill', 'visibility', 'visible');
							map.setLayoutProperty('us_states_pop_fill', 'visibility', 'none');
							map.setLayoutProperty('us_counties_fill', 'visibility', 'none');
							map.setLayoutProperty('us_counties_pop_fill', 'visibility', 'none');
						} else if (curr_data_pop_level == "population"){
							map.setPaintProperty('us_states_pop_fill', 'fill-color', {
								property: curr_lookup,
								stops: legend_stops
							});
							map.setLayoutProperty('us_states_fill', 'visibility', 'none');
							map.setLayoutProperty('us_states_pop_fill', 'visibility', 'visible');
							map.setLayoutProperty('us_counties_fill', 'visibility', 'none');
							map.setLayoutProperty('us_counties_pop_fill', 'visibility', 'none');
						}
					};


					update_legend(legend_stops)
					$slider_info_box.text(format_date(curr_date));

					// if ($active_county != ""){
					// 	update_tooltip()
					// };
				};

				// calculate which legend stops to use
				function calc_legend_stops(curr_datatype_metric, curr_datatype_type, curr_data_level, curr_data_pop_level){
					if (curr_data_level == "county"){
						if (curr_datatype_type == "current"){
							if (curr_datatype_metric == "cases"){
								if (curr_data_pop_level == "base"){
									var stops = [0, 100, 1000, 5000, 10000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 1000, 2500, 5000, 10000]
								}
							} else if (curr_datatype_metric == "deaths") {
								if (curr_data_pop_level == "base"){
									var stops = [0, 1, 10, 100, 1000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 50, 100, 500, 1000]
								}
							}
						} else if (curr_datatype_type == "daily"){
							if (curr_datatype_metric == "cases"){
								if (curr_data_pop_level == "base"){
									var stops = [0, 1, 10, 100, 1000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 10, 25, 50, 100]
								}
							} else if (curr_datatype_metric == "deaths") {
								if (curr_data_pop_level == "base"){
									var stops = [0, 1, 5, 10, 100]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 1, 5, 10, 25]
								}
							}
						}
					} else if (curr_data_level == "state"){
						if (curr_datatype_type == "current"){
							if (curr_datatype_metric == "cases"){
								if (curr_data_pop_level == "base"){
									var stops = [0, 50000, 100000, 500000, 1000000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 1000, 2500, 5000, 7500]
								}
							} else if (curr_datatype_metric == "deaths") {
								if (curr_data_pop_level == "base"){
									var stops = [0, 500, 1000, 5000, 10000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 25, 50, 100, 150]
								}
							}
						} else if (curr_datatype_type == "daily"){ 
							if (curr_datatype_metric == "cases"){
								if (curr_data_pop_level == "base"){
									var stops = [0, 500, 1000, 5000, 10000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, 5, 10, 25, 50]
								}
							} else if (curr_datatype_metric == "deaths") {
								if (curr_data_pop_level == "base"){
									var stops = [0, 50, 100, 500, 1000]
								} else if (curr_data_pop_level == "population"){
									var stops = [0, .25, 0.5, 0.75, 1]
								}
							}
						}
					}

					legend_stops = [
						[stops[0], 'darkgray'],
						[stops[1], 'green'],
						[stops[2], 'yellow'],
						[stops[3], 'darkorange'],
						[stops[4], 'red']
					];

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
					var curr_data_level = $("input.rb_data_level:checked").val();
					var curr_data_pop_level = $("input.rb_data_pop_level:checked").val();

					if (curr_data_level == "county"){
						var curr_data = $active_county_prop
						$('#tooltip_header_name').text(curr_data["NAMELSAD"] + ", " + curr_data["state_abbr"])
					} else if (curr_data_level == "state"){
						var curr_data = $active_state_prop;
						$('#tooltip_header_name').text(curr_data["NAME"])
					};
					$('#tooltip_header_date').text(format_date(curr_date))

					// get data based on selections
					if (curr_datatype_type == "daily"){
						var type_lookup = "PD_";
						$('#tooltip_header_type').text("Daily Metrics: ")
					} else if (curr_datatype_type == "current"){
						var type_lookup = "_";
						$('#tooltip_header_type').text("Current Metrics: ")
					};
					

					// create row for each displayed prop
					var displayed_properties = ["cases" + type_lookup + curr_date_id, "deaths" + type_lookup + curr_date_id]

					if (curr_data_pop_level == "base"){
						var label_display = [" Reported Cases", "Reported Deaths"]
					} else if (curr_data_pop_level == "population"){
						var label_display = [" Reported Cases (per 100k)", "Reported Deaths (per 100k)"]
					}
					
					$("tr.tooltip_data_row").remove()
					$.each(displayed_properties, function(prop_ind, prop) {
						label_text = label_display[prop_ind]

						append_string = ""
						append_string = "<tr class='tooltip_data_row'>"
						append_string = append_string + "<td class='tooltip_data_label'>" + label_text + "</td>"
						append_string = append_string + "<td class='tooltip_data_val'>" + $.number(curr_data[prop]) + "</td>"
						append_string = append_string + "</tr>"

						$tooltip_body.append(append_string);
					});

					$tooltip_box.css({'top': mouseY + 10,'left': mouseX + 10}).show();
				};

				// update the total info chart
				function update_ti_chart(){
					chart_data = get_ti_chart_data()
					load_info_chart(chart_data, "total")
				};

				// update the county info chart
				function update_ci_chart(data_level){
					chart_data = get_ci_chart_data(data_level)
					load_info_chart(chart_data, "county")
				};

				// show info on the clicked county
				function show_county_info(data_level){
					update_ci_chart(data_level)
					toggle_ci_box(true)
				};

				// load an info chart
				function load_info_chart(chart_data, chart_category){
					var county_data = $selected_county_prop;
					var state_data = $selected_state_prop;
					if (chart_category == "county"){
						var chart_container = $("#county_chart_container")
						var chart_metric = $("input.rb_dataopt_metric_chart:checked").val();
						var chart_type = $("input.rb_dataopt_type_chart:checked").val();
						var chart_level = $("input.rb_data_level:checked").val();
						var chart_pop_level = $("input.rb_data_pop_level:checked").val();

						// destroy existing chart if it exists
						if (typeof(county_chart) != "undefined"){
							county_chart.destroy()
						};

						if (chart_level == "county"){
							var title_text = county_data["NAMELSAD"] + ", " + county_data["state_name"]
						} else if (chart_level == "state") {
							var title_text = state_data["NAME"]
						};

						var chart_title = {
					            display: true,
					            text: title_text,
					            fontSize: 24,
					            fontColor: "white"
					        }

					    var chart_legend = {
					        	labels:{
					        		fontColor:"white",
					        		fontSize: 14
					        	},
					        	onHover: (event, chartElement) => {
							    	event.target.style.cursor = 'pointer'
								}
					        }

					    var chart_xaxis = [{
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
					} else {
						var chart_container = $("#total_chart_container")
						var chart_metric = $("input.rb_dataoptall_metric_chart:checked").val();
						var chart_type = $("input.rb_dataoptall_type_chart:checked").val();
						var chart_pop_level = "base";

						// destroy existing chart if it exists
						if (typeof(total_chart) != "undefined"){
							total_chart.destroy()
						};

						var chart_title = {
					            display: true,
					            text: "Total U.S.",
					            fontSize: 16,
					            fontColor: "white",
					            padding: 0
					        }

					    var chart_legend = {
					        	labels:{
					        		fontColor:"white",
					        		fontSize: 12
					        	},
					        	onHover: (event, chartElement) => {
							    	event.target.style.cursor = 'pointer'
								}
					        }

					    var chart_xaxis = [{
			            		id: 'date',
			                	ticks: {
			                		callback: function(label, index, labels) {
			                			date_val = new Date(label.substring(0,4), label.substring(4,6) -1, label.substring(6,8))
			                			date_val = format_date(date_val).substring(0,8)
				                        return date_val;
				                    },
							        fontColor: "white",
							        fontSize:11,
							        autoSkip: true,
			        				maxTicksLimit: 10
			            		},
			            	}]
					};

					if (chart_pop_level == "base"){
						var chart_pop_label_1 = "Reported Cases"
						var chart_pop_label_2 = "Reported Deaths"
					} else if (chart_pop_level == "population"){
						var chart_pop_label_1 = "Reported Cases (per 100k)"
						var chart_pop_label_2 = "Reported Deaths (per 100k)"
					};
				
					if (chart_type == "current"){
						var chardata_type = "line";

						if (chart_metric == "cases"){
							chartdata = [{	
					        	type: chardata_type,
					            label: chart_pop_label_1,
					            data: chart_data[1],
					            yAxisID: 'cases',
					            borderColor: chartcolor_2,
					            fill: false
					        }]

				        	yAxis_options = [{
						            		id: 'cases',
						            		position: 'right',
						                	ticks: {
							                    beginAtZero: true,
							                    callback: function(label, index, labels) {
							                        return ($.number(label/1000)).toString() + 'k';
							                    },
										        fontColor: "white"
					                		},
					                		scaleLabel: {
										        display: true,
										        labelString: chart_pop_label_1,
										        fontColor: "white"
										    },
										    gridLines: {
										    	display:true,
										    	color:"#595959",
										    	lineWidth:0.5
										    }
					                	}]


						} else if (chart_metric == "deaths"){
							chartdata = [{	
								type: chardata_type,
					            label: chart_pop_label_2,
					            data: chart_data[2],
					            yAxisID: 'deaths',
					            borderColor: chartcolor_1,
					            fill: false
					        }]

					        yAxis_options = [{
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
										        labelString: chart_pop_label_2,
										        fontColor: "white"
										    },
										    gridLines: {
										    	display:true,
										    	color:"#595959",
										    	lineWidth:0.5
										    }
					               	}]

						} else if (chart_metric == "both"){
							chartdata = [{	
								type: chardata_type,
					            label: chart_pop_label_2,
					            data: chart_data[2],
					            yAxisID: 'deaths',
					            borderColor: chartcolor_1,
					            fill: false
					        },
					        {	
					        	type: chardata_type,
					            label: chart_pop_label_1,
					            data: chart_data[1],
					            yAxisID: 'cases',
					            borderColor: chartcolor_2,
					            fill: false
					        }]

					        yAxis_options = [{
						            		id: 'cases',
						            		position: 'right',
						                	ticks: {
							                    beginAtZero: true,
							                    callback: function(label, index, labels) {
							                        return ($.number(label/1000)).toString() + 'k';
							                    },
										        fontColor: "white"
					                		},
					                		scaleLabel: {
										        display: true,
										        labelString: chart_pop_label_1,
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
										        labelString: chart_pop_label_2,
										        fontColor: "white"
										    }
					               	}]
				    	};
					} else if (chart_type == "daily"){
						var chardata_type = "bar";

				        if (chart_metric == "cases"){
							chartdata = [{	
					        	type: chardata_type,
					            label: chart_pop_label_1,
					            data: chart_data[3],
					            yAxisID: 'cases',
					            borderColor: chartcolor_2,
					            backgroundColor: chartcolor_2
					        }]

					        yAxis_options = [{
						            		id: 'cases',
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
										        labelString: chart_pop_label_1,
										        fontColor: "white"
										    },
										    gridLines: {
										    	display:true,
										    	color:"#595959",
										    	lineWidth:0.5
										    }
					                	}]
						} else if (chart_metric == "deaths"){
							chartdata = [{		
								type: chardata_type,	     		
					            label: chart_pop_label_2,
					            data: chart_data[4],
					            yAxisID: 'deaths',
					            borderColor: chartcolor_1,
					            backgroundColor: chartcolor_1
					        }]

					         yAxis_options = [{
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
										        labelString: chart_pop_label_2,
										        fontColor: "white"
										    },
										    gridLines: {
										    	display:true,
										    	color:"#595959",
										    	lineWidth:0.5
										    }
					               	}]
						} else if (chart_metric == "both"){
							chartdata = [{		
								type: chardata_type,	     		
					            label: chart_pop_label_2,
					            data: chart_data[4],
					            yAxisID: 'deaths',
					            borderColor: chartcolor_1,
					            backgroundColor: chartcolor_1
					        },
					        {	
					        	type: chardata_type,
					            label: chart_pop_label_1,
					            data: chart_data[3],
					            yAxisID: 'cases',
					            borderColor: chartcolor_2,
					            backgroundColor: chartcolor_2
					        }]

					        yAxis_options = [{
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
										        labelString: chart_pop_label_1,
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
										        labelString: chart_pop_label_2,
										        fontColor: "white"
										    }
					               	}]
				    	};
					};

					// create chart
					chart_temp = new Chart(chart_container, {
						type: chardata_type,
					    data: {
					        labels: chart_data[0],
					        datasets: chartdata
					    },
					    options: {
					        scales: {
					            yAxes: yAxis_options,
			               		xAxes: chart_xaxis
					        },
					        title: chart_title,
					        legend: chart_legend,
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

						    			if (chart_metric == "cases"){
											var colors = {
						                        borderColor: chartcolor_2,
						                        backgroundColor: chartcolor_2
							                };
										} else if (chart_metric == "deaths"){
											var colors = {
						                        borderColor: chartcolor_1,
						                        backgroundColor: chartcolor_1
						                    };
										} else if (chart_metric == "both"){
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
								    	};
								    	
					                    return colors
					                },
			                    },
					        },
					        onHover: (event, chartElement) => {
							   	event.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
							}
					    }
					});

					if (chart_category == "county"){
						county_chart = chart_temp;
					} else {
						total_chart = chart_temp;
					};
				};

				function get_ti_chart_data(){

					// create array to feed to chart
					var chart_data = [[],[],[],[],[]]
					$.each(date_list, function(date_ind, date_val){

						chart_data[0].push(date_val)

						// current
						if (typeof(data_total["cases_" +date_val]) != "undefined"){
							chart_data[1].push(data_total["cases_" + date_val])
						} else{
							chart_data[1].push(0);
						};

						if (typeof(data_total["deaths_" + date_val]) != "undefined"){
							chart_data[2].push(data_total["deaths_" + date_val])
						} else{
							chart_data[2].push(0)
						};

						// per day
						if (typeof(data_total["casesPD_" +date_val]) != "undefined"){
							chart_data[3].push(data_total["casesPD_" + date_val])
						} else{
							chart_data[3].push(0);
						};
						if (typeof(data_total["deathsPD_" + date_val]) != "undefined"){
							chart_data[4].push(data_total["deathsPD_" + date_val])
						} else{
							chart_data[4].push(0)
						};
						
					});

					return chart_data;
				};

				function get_ci_chart_data(data_level){
					if (data_level == 'county'){
						var curr_data = $selected_county_prop;
					}	else if (data_level == 'state'){
						var curr_data = $selected_state_prop;
					}

					// create array to feed to chart
					var chart_data = [[],[],[],[],[]]
					$.each(date_list, function(date_ind, date_val){

						chart_data[0].push(date_val)

						// current
						if (typeof(curr_data["cases_" +date_val]) != "undefined"){
							chart_data[1].push(curr_data["cases_" + date_val])
						} else{
							chart_data[1].push(0);
						};

						if (typeof(curr_data["deaths_" + date_val]) != "undefined"){
							chart_data[2].push(curr_data["deaths_" + date_val])
						} else{
							chart_data[2].push(0)
						};

						// per day
						if (typeof(curr_data["casesPD_" +date_val]) != "undefined"){
							chart_data[3].push(curr_data["casesPD_" + date_val])
						} else{
							chart_data[3].push(0);
						};
						if (typeof(curr_data["deathsPD_" + date_val]) != "undefined"){
							chart_data[4].push(curr_data["deathsPD_" + date_val])
						} else{
							chart_data[4].push(0)
						};
						
					});

					return chart_data;
				};

				// hide/show total info box
				function toggle_ti_box(bool_action){
					if ($(window).height() < 850){
						$('#total_info_box').removeClass('tib_width_largescreen').addClass('tib_width_smallscreen')
					} else {
						$('#total_info_box').addClass('tib_width_largescreen').removeClass('tib_width_smallscreen')
					}

					if (bool_action == true){
						$('#ti_minimized').hide();
						$('#ti_maximized, #total_info_body').show();
					} else {
						$('#ti_maximized, #total_info_body').hide();
						$('#ti_minimized').show();
					};
				};

				// hide/show the county info box
				function toggle_ci_box(bool_action){
					if (bool_action == true){
						$county_info_box.show();
					} else {
						$county_info_box.hide();
					};
				};

				// highlight shapes
				function toggle_highlight_shp(county_index, bool_active){
					map.setFeatureState({source: 'us_counties', id: county_index}, { hover: bool_active });
				};
				function toggle_highlight_shp_st(state_index, bool_active){
					map.setFeatureState({source: 'us_states', id: state_index}, { hover: bool_active });
				};
				function toggle_highlight_shp_pop(county_index, bool_active){
					map.setFeatureState({source: 'us_counties_pop', id: county_index}, { hover: bool_active });
				};
				function toggle_highlight_shp_st_pop(state_index, bool_active){
					map.setFeatureState({source: 'us_states_pop', id: state_index}, { hover: bool_active });
				};

				// format a date from int state
				function format_date(raw_date){
					updated_date = new Date((new Date(raw_date) / 1000) * 1000)
					updated_date = updated_date.toISOString().split('T')[0].split("-")
					updated_date = updated_date[1] + "-" + updated_date[2] + "-" + updated_date[0]
					return updated_date
				};

				// play history for selected data
				var last_idx = date_list.length
				var hist_idx = 0;
				function play_history(){
					if (hist_idx == 0){
						$date_slider.slider("disable");
						var next_date = date_list[hist_idx];
						next_date = new Date(next_date.substring(0,4), next_date.substring(4,6) -1, next_date.substring(6,8));
						$date_slider.slider("option","value", next_date / 1000);
						update_map(next_date / 1000);
					};

					hist_idx++
					if (hist_idx < last_idx){
						setTimeout(function() {
							var next_date = date_list[hist_idx];
							next_date = new Date(next_date.substring(0,4), next_date.substring(4,6) -1, next_date.substring(6,8));
							$date_slider.slider("option","value", next_date / 1000);
							update_map(next_date / 1000);
							play_history();
						}, hist_idx * 100 - ((hist_idx - 1) * 100) );
					} else {
						setTimeout(function() {
							hist_idx = 0;
							$date_slider.slider("enable");
						}, 1000 );
					};
				};
			}
		});
});