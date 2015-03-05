var info = L.control();
var geojson_A;
var geojson_B;
var layerControl;
var margin = {top: 10, right: 10, bottom: 40, left: 40};
var width = 500 - margin.left - margin.right;
var height = 300 - margin.top - margin.bottom;
var quantize;
// var x = d3.scale.ordinal().rangeRoundBands([0, width], .1);
        
// var y = d3.scale.linear().range([height,0]);
        
// var xAxis = d3.svg.axis().scale(x).orient("bottom");
        
// var yAxis = d3.svg.axis().scale(y).orient("left");


 $(function(){
  	$('.slider-arrow').click(function(){
    		if($(this).hasClass('show')){
    		$( ".slider-arrow, .panel" ).animate({
      		  left: "+=300"
      		}, 700, function() {
       		  // Animation complete.
      		});
      	$(this).html('&laquo;').removeClass('show').addClass('hide');
    }
    else {      
    $( ".slider-arrow, .panel" ).animate({
      left: "-=300"
      }, 700, function() {
        // Animation complete.
      });
      $(this).html('&raquo;').removeClass('hide').addClass('show');    
    }
  });
});

function addGeoJsonToMap(geoUrl){
  var wards = new L.LayerGroup();

  $.ajax({
      type: "GET",
      url: geoUrl,
      dataType: 'json',
      success: function (response) {
             L.geoJson(response, {style: censusBlockStyle}
          ).addTo(wards);

          var overlays = {
            "Wards": wards
          };

          layerControl = L.control.layers(null,overlays).addTo(Window.map);

      }
    });
}

function callServiceForOverlay(){
  var urlParameters = getUrlParameters();
  // console.log(dataSourceType);
  if(geojson_A && geojson_B==null){
    // geojsonArr.forEach({})
    // geojson_A.clearLayers();
    Window.map.removeLayer(geojson_A);
  };
  if(geojson_B){
    layerControl.removeLayer(geojson_A);
    geojson_A.clearLayers();
    geojson_B.clearLayers();
    layerControl.removeLayer(geojson_B);
    geojson_A=null;
    geojson_B=null;
    $("#plot").empty();
  };
  
  $.ajax({
      type: "GET",
      url: "/rastergrid?type=" + urlParameters,
      dataType: 'json',
      success: function (response) {
              
              // get min and max
              var max = d3.max(response.features, function(d){ 
                return d.properties.value;
              });
              

              console.log("max [" + max + "]");      

            var layerName = $("#datasource_combo").val();
            quantize = d3.scale.quantize()
              .domain([d3.min(response.features, function(d){ return d.properties.value;}), d3.max(response.features, function(d){ return d.properties.value;})])
              .range(d3.range(7).map(function(i) { return i ; }));

            if(geojson_A!=null ){
              Window.map.removeLayer(geojson_A);
            };
              geojson_A = L.geoJson(response, {
                style: style,
                onEachFeature: onEachFeature
                });
              geojson_A.addTo(Window.map);
              // layerControl.addOverlay(geojson_A, layerName);
              geojson_A["layerName"] = layerName;
          
             
            if($('.info')[0]==null){
              info.addTo(Window.map);
            };
         
         $('.slider-arrow').click();
      }
    });
}

function createCorrelationChart(){

    barGraphDiv = d3.select("#plot");
    var svg = barGraphDiv.append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
//  get json data 
    var chart ={};
      geojson_B.eachLayer(function(d){
          var chartFeat = {};
          chartFeat.name = d.feature.properties.name;
          chartFeat.x = d.feature.properties.value;
          chartFeat.y =0.0;
          chart[d.feature.properties.name] = chartFeat;
      });

      geojson_A.eachLayer(function(d){
        if(chart[d.feature.properties.name]){
          chart[d.feature.properties.name].y = d.feature.properties.value;
        }else{
          var chartFeat = {};
          chartFeat.name = d.feature.properties.name;
          chartFeat.x = 0.0;
          chartFeat.y =d.feature.properties.value;
          chart[d.feature.properties.name] = chartFeat;
        };
      });

      var chartArr= getObjectToArray(chart);
      
      var xValue = function(d) { return d.x;}, // data -> value
        xScale = d3.scale.linear().range([0, width]), // value -> display
        xMap = function(d) { return xScale(xValue(d));}, // data -> display
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");

// setup y
      var yValue = function(d) { return d.y;}, // data -> value
      yScale = d3.scale.linear().range([height, 0]), // value -> display
      yMap = function(d) { return yScale(yValue(d));}, // data -> display
      yAxis = d3.svg.axis().scale(yScale).orient("left");

      xScale.domain([0, d3.max(chartArr, xValue)]);
      yScale.domain([0, d3.max(chartArr, yValue)]);

      // d3.max(data, function(d) { return d.frequency; }

       // x-axis
      svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
        .append("text")
          .attr("class", "label")
          .attr("x", width)
          .attr("y", -6)
          .style("text-anchor", "end")
          .text(geojson_B.layerName);

      // y-axis
      svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
          .attr("class", "label")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text(geojson_A.layerName);

          console.log(yScale(.001));
      svg.selectAll(".dot")
        .data(chartArr)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 1.5)
        .attr("cx", function (d) { return xScale(d.x); } )
        .attr("cy", function (d) { return yScale(d.y); } );

}

function getObjectToArray(obj){
  var objects = [];
  for (var i in obj){
    if (!obj.hasOwnProperty(i)) continue;
    if (typeof obj[i] == 'object'){
      // objects = objects.concat(getObjectToArray(obj[i]));
      objects.push(obj[i]);
    }
  }
  return objects;
}

function getCorrelation(xArray, yArray) {
  function sum(m, v) {return m + v;}
  function sumSquares(m, v) {return m + v * v;}
  function filterNaN(m, v, i) {isNaN(v) ? null : m.push(i); return m;}

  // clean the data (because we know that some values are missing)
  var xNaN = _.reduce(xArray, filterNaN , []);
  var yNaN = _.reduce(yArray, filterNaN , []);
  var include = _.intersection(xNaN, yNaN);
  var fX = _.map(include, function(d) {return xArray[d];});
  var fY = _.map(include, function(d) {return yArray[d];});

  var sumX = _.reduce(fX, sum, 0);
  var sumY = _.reduce(fY, sum, 0);
  var sumX2 = _.reduce(fX, sumSquares, 0);
  var sumY2 = _.reduce(fY, sumSquares, 0);
  var sumXY = _.reduce(fX, function(m, v, i) {return m + v * fY[i];}, 0);

  var n = fX.length;
  var ntor = ( ( sumXY ) - ( sumX * sumY / n) );
  var dtorX = sumX2 - ( sumX * sumX / n);
  var dtorY = sumY2 - ( sumY * sumY / n);
 
  var r = ntor / (Math.sqrt( dtorX * dtorY )); // Pearson ( http://www.stat.wmich.edu/s216/book/node122.html )
  var m = ntor / dtorX; // y = mx + b
  var b = ( sumY - m * sumX ) / n;

  // console.log(r, m, b);
  return {r: r, m: m, b: b};
}

function censusBlockStyle(feature){
    return{
      fillColor:getCensusBlockColor(feature.properties.mostCommonComplaint),
      fillOpacity:0.6,
      weight:1,
      color:'',
      opacity:0.8
    };
}

function wardStyle_original(feature){
    return{

      fill:'',
      weight:1,
      opacity:1
    };
}

function style(feature) {
    return {
        fillColor: getColor(quantize(feature.properties.value)),
        weight: 2,
        opacity: 1,
        color: '',
        dashArray: '0',
        fillOpacity: 0.45
    };
}

	function onEachFeature(feature, layer) {
	    layer.on({
	        mouseover: highlightFeature,
	        mouseout: resetHighlight,
	        // click: zoomToFeature
	    });
	}

function resetHighlight(e) {
    geojson_A.resetStyle(e.target);
    info.update();
}


function highlightFeature(e) {
	    var layer = e.target;

	    layer.setStyle({
	        weight: 5,
	        color: '#666',
	        dashArray: '',
	        fillOpacity: 0.7
	    });

	    if (!L.Browser.ie && !L.Browser.opera) {
	        layer.bringToFront();
	    }
	    info.update(layer.feature.properties);
}

function getCensusBlockColor(d) {
    return d == 'potholes' ? '#800026': //maroon
           d == 'aband_veh' ? '#DC49FD': //purple
           d == 'alley_light_out' ? '#E31A1C': //red
           d == 'rodent' ? '#494CFD': //dark blue
           d == 'street_light_out' ? '#FD8D3C': //tangerine
           d == 'graffiti' ? '#49FD82': //bright green
           d == 'sanViol' ? '#49E2FD': //light blue
                  '';
}
function getColor(d) {
    return d == 6 ? '#800026' : 
           d == 5 ? '#BD0026' :
           d == 4 ? '#E31A1C' :
           d == 3 ? '#FC4E2A' :
           d == 2 ? '#FD8D3C' :
           d == 1 ? '#FEB24C' :
           d == 0 ? '#FED976' :
                  '';
}

function getColor_og(d) {
    return d > .06 ? '#800026' :
           d > .040 ? '#BD0026' :
           d > .020 ? '#E31A1C' :
           d > .010 ? '#FC4E2A' :
           d > .008 ? '#FD8D3C' :
           d > .004 ? '#FEB24C' :
           d > .00001 ? '#FED976' :
                  '';
}

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

	// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = '<h4>Grid Value</h4>' +  (props ?
        '<b>' + props.name + '</b><br />' + props.value + ' units'
        : 'Hover over a grid');
};