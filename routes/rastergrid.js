var url = require("url");
var mongo = require('mongodb');

var numbers = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
  queue = [];

var gridSum = {};
var features = [];
var Server = mongo.Server,
	Db = mongo.Db,
	BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {auto_reconnect: true}, {w: 1});
db = new Db('open_data_chicago', server);

db.open(function(err, db){
	if(!err){
		console.log("Connected to 'open_data_chicago' database");
		// db.collection('wines', {strict:true}, function(err, collection){
		// 	if(err){
		// 		console.log("The 'wines' collection doesn't exist. Creating it with the sample data...");
		// 		populateDB();
		// 	}
		// });
	}
});

exports.geojson = function(req, res) {
	// var id = req.params.id;
	console.log('Retrieving geojson: ');
	
	var _get = url.parse(req.url, true).query;
	console.log('check for params' + _get["type"] + " - " + _get["startdate"] + " - " + _get["status"]);
	features = [];
	gridSum["length"]=0;
	getSumValues(_get, function(err, data){
		console.log("data and number of gridsums " + gridSum["length"]);
		// res.send({"hello":"world"});
		// once we get the gridSum values, need to loop through features array to add value
		// res.send(JSON.stringify(gridSum));
		// features.forEach(function(feat){
		featureArray =[];
		for (var k=0; k<features.length; k++){
			var featProps = features[k].properties;
			
			if(gridSum[featProps.name]){
				featProps["value"] = gridSum[featProps.name];
				featureArray.push(features[k]);
				// console.log(featProps.name + ";" + gridSum[featProps.name]);
			};
		};
		res.send(JSON.stringify(createGeoJson(featureArray)));

	});
	features = [];
};

exports.slow = function(req, res){
	features = [];
	console.log('Retrieving slow: ');
	res.send(JSON.stringify(createGeoJson()));
	features = [];
};

function createGeoJson(featureArray){
	if(features.length ==0){
		coords1 = [[[-87.6278, 41.8819],[-87.5278, 41.8819],[-87.5278, 41.7819],[-87.6278, 41.7819],[-87.6278, 41.8819]]];
		features.push(createFeature("Feature","grid A", null, "Polygon",coords1));

		coords2 = [[[-87.6278, 41.8819],[-87.6278, 41.7819],[-87.7278, 41.7819],[-87.7278, 41.8819],[-87.6278, 41.8819]]];
		features.push(createFeature("Feature","grid B", 32, "Polygon",coords2));
	}

	var geoJson = {};
	geoJson["type"] = "FeatureCollection";
	if(featureArray){
		geoJson["features"] = featureArray;
	}else{
		geoJson["features"] = features;	
	}
	
	return geoJson;

};

function createFeature(type, name, value, geomType, geometryCoords){
	var feature = {};
	feature["type"] = type;
	var properties = {};
	properties["name"] = name;
	properties["value"] = value;
	feature["properties"] = properties;
	var geometry = {};
	geometry["type"] = geomType;
	geometry["coordinates"] = JSON.parse(geometryCoords);
	feature["geometry"] = geometry;

	return feature;
};

function getSumValues(getParams, func) {
		
 var i=0;
 var lastItem = false;
// call 
			db.collection('gridpoints', function(err, collection){
					// collection.find({'row':40}).toArray(function(err, grids){
				collection.find().toArray(function(err, grids){
					// db.collection('rodent_baiting', function(err, reqCollection){
						grids.forEach(function(grid){
							
								features.push(createFeature("Feature",grid.grid_id, null, "Polygon",grid.geoCoordsJson));
														// 
							findNearbyGridPointsAndSum(grid.grid_id, getParams, function(err, rod_items){
								// gridSum[grid.grid_id] = 11.1;
								i++;
								if(i==grids.length){
									console.log(i + " last item / rodent items " +  rod_items.length);
									func(null, rod_items);
								}

							});
							// i++;
						});
						
					// });
				});
			});
	

};

function getGridPtVal(distFt, radiusFt){
	if(distFt<radiusFt){
		return 1/radiusFt;
	}else{
		return 1/distFt;
	}
};

function findNearbyGridPointsAndSum(gridId, getParams, callback){
	// console.log("here we are");
	collectionName = getParams["type"];

			db.collection(collectionName, function(err, collection){
				var qry = {'gridPts.grid_id':{'$in':[gridId]}};
				if(getParams["status"] && getParams["status"]!="All"){
					qry = {$and:[{"gridPts.grid_id":{"$in":[gridId]}},{"status":getParams["status"]}]}
				}
				collection.find(qry).toArray(function(err, rod_items){
			
					rod_items.forEach(function(rod){
						for(var i = 0, l= rod.gridPts.length; i <l; i++){
							var gridpts_entry = rod.gridPts[i];
							if(gridpts_entry.grid_id===gridId){
								if(gridSum[gridId]>0){
									gridSum[gridId]+= getGridPtVal(gridpts_entry.distanceFt, 660);	
								}else{
									gridSum[gridId] = getGridPtVal(gridpts_entry.distanceFt, 660);	
									gridSum["length"]++;	
								}
								
								// console.log( gridpts_entry.grid_id + "[" + gridpts_entry.distanceFt + "]" + gridSum[gridId]);
							};
						};
					});
					// console.log(gridId + " " + gridSum['81-56']);
					callback(null, rod_items);
				});
				// loop through gridPts if it matches entry.grid_id, add it to gridSum
			});
	
};