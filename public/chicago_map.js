var info = L.control();
var geojson;

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
  $.ajax({
      type: "GET",
      url: geoUrl,
      dataType: 'json',
      success: function (response) {
             L.geoJson(response, {style: wardStyle}
          ).addTo(Window.map);
            
      }
    });
}

function wardStyle(feature){
    return{
      fill:'',
      weight:1,
      opacity:1
    };
}

function style(feature) {
    return {
        fillColor: getColor(feature.properties.value),
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
    geojson.resetStyle(e.target);
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
function getColor(d) {
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