  $(function() {
      $( ".datepicker" ).datepicker({
        minDate: new Date(2014,1-1,1),
        maxDate: new Date(2014,4-1,10)
      });
      $("#startDate").datepicker(
        'setDate', new Date(2014,1-1,1)
      );
      $("#endDate").datepicker(
        'setDate', new Date(2014,4-1,10)
      );
  });

$(function() {
  $('#datasource_combo').change(function(){
     if($('#datasource_combo').val() == "abandoned_buildings"){
      // change status to 'All' and disable status select
       $('#status_combo option').filter(function(){
          return $(this).text() == 'All';
        }).attr('selected', true);
        $('#status_combo').attr('disabled','disabled');
        // also need to change min and max dates
        $( ".datepicker" ).datepicker(
           'option','minDate',new Date(2013,1-1,1));
      }else{
        $('#status_combo').removeAttr('disabled');
        $( ".datepicker" ).datepicker(
          'option','minDate',new Date(2014,1-1,1));
      }

  });
});

function getUrlParameters(){
  var dataSourceType = $("#datasource_combo").val();
        var status = "";
        var startdate="";
        var enddate="";
        if($("#status_combo").val().length>0){
          status = "&status=" + $("#status_combo").val();
        };

        if($("#startDate").val().length>0){
          startdate = "&startdate=" + encodeURIComponent($("#startDate").val());
        };

        if($("#endDate").val().length>0){
          enddate = "&enddate=" + encodeURIComponent($("#endDate").val());
        };
    return dataSourceType + startdate + status + enddate
}

function callWardSumsService(){
        
        var urlParameters = getUrlParameters();
        $.ajax({
            type: "GET",
            url: "/wardSums?type=" + urlParameters,
            dataType: 'json',
            success: function (response) {

              //- update data for themtic ward map
              var rateById = {};
            
              response.forEach(function(d) { rateById[d.ward] = +d.frequency; });
              var maxY = d3.max(response, function(d) { return d.frequency; });
              quantize = d3.scale.quantize()
                .domain([0, maxY])
                .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

              gm.selectAll("path")
              .attr("class", function(d) { return quantize(rateById[d.properties.WARD]); });
           
              // set all of the bar heights to 0
              svg.selectAll(".bar")
                  .attr("y", height)
                  .attr("height", 0);
              svg.selectAll(".selected")
                  .attr("y", height)
                  .attr("height", 0);
              //- update the data for bar chart
             
                response.forEach(function(d) {
                    d.frequency = +d.frequency;
                });
                response.map(function(d) { return d.ward; });

                y.domain([0, maxY]);
                yAxis = d3.svg.axis().scale(y).orient("left");

                svg.selectAll(".bar")
                 .data(response)
                 .attr("class", "bar")
                 .attr("id", function(d){ return "wardbar" + d.ward;})
                 .attr("y", function(d) { return y(d.frequency); })
                 .attr("width", x.rangeBand())
                 .attr("x", function(d) { return x(d.ward); })
                 .attr("height", function(d) { return  height - y(d.frequency); });

                 svg.selectAll("g.y.axis").call(yAxis);
              
            }
          });
  }

function callServiceForOverlay(){
	var urlParameters = getUrlParameters();
	// console.log(dataSourceType);
	if(geojson){
		geojson.clearLayers();
	};
	
	$.ajax({
    	type: "GET",
    	url: "/rastergrid?type=" + urlParameters,
    	dataType: 'json',
    	success: function (response) {
        	    geojson = L.geoJson(response, {
            	style: style,
				onEachFeature: onEachFeature
        	}).addTo(Window.map);
       	    if($('.info')[0]==null){
       	    	info.addTo(Window.map);
       	    };
         
         $('.slider-arrow').click();
    	}
  	});
}
         
