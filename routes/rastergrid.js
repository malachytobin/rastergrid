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

exports.wardSums = function(req, res) {
	console.log('getting ward sums json');
	var _get = url.parse(req.url, true).query;
	console.log('check for params' + _get["type"] + " - " + _get["startdate"] + " - " + _get["status"]);
	getMongoWardSums(_get, function(err, results){
		res.send(JSON.stringify(results));	
	});	
};

exports.geojson = function(req, res) {
	// var id = req.params.id;
	console.log('Retrieving geojson: ');
	
	var _get = url.parse(req.url, true).query;
	console.log('check for params' + _get["type"] + " - " + _get["startdate"] + " - " + _get["status"]);
	features = [];
	gridSum = {};
	gridSum["length"]=0;

	getSumValues(_get, function(err, data){
		console.log("data and number of gridsums " + gridSum["length"]);

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

function getCoreQry(getParams){

}

function getWardSumsQuery(getParams, groupQry){
	var qry ;
	var qryArr=[];
	

	if(getParams["status"] && getParams["status"]!="All"){				
		qryArr.push({"status":getParams["status"]});
	}

	if(getParams["startdate"]){
		var startdate = getParams["startdate"];
		qryArr.push({"create_date_epoch":{"$gte": new Date(startdate).getTime()}});		
	}

	if(getParams["enddate"]){
		var enddate = getParams["enddate"];
		qryArr.push({"create_date_epoch":{"$lte": new Date(enddate).getTime()}});		
	}

	if(qryArr.length>0){
		qry = '{"$match":{"$and":['; 	

		qryArr.forEach(function(element){
			// console.log(element);
			qry += JSON.stringify(element) + "," ;
		});
		// remove last comma
		qry = qry.slice(0, -1);
		qry+= "]}}";
	}
	console.log(qry);
	if(qry){
		return JSON.parse(qry);
	}
	return qry;
};

function getMongoWardSums(params, func){
	// db.rodent_baiting.aggregate({$group: {_id : "$ward", frequency:{"$sum":1}}})
	var wardSumResponse =[];
	var dataType = "rodent_baiting";
	var match;
	if(params["type"]!=null){
		dataType = params["type"];
	}

	
	match = getWardSumsQuery(params,"");
	

	db.collection(dataType, function(err, collection){
		var qry ="[";
		if(match){
			qry += JSON.stringify(match) + ",";
		}
		qry += JSON.stringify({"$group": {"_id": "$ward", "frequency": {"$sum":1}}});
		qry += "]";
		console.log(qry);
		qry = JSON.parse(qry);

		collection.aggregate(qry, function(err, items){
			items.forEach(function(item){
				var ward = {};
				ward.ward = item._id;
				ward.frequency = item.frequency;
				wardSumResponse.push(ward);
			})
			// console.log("error" + err);
			// console.log(wardSumResponse.length);
			return func(null, wardSumResponse);
			
		});

		// db.rodent_baiting.aggregate([{"$group": {"_id": "$ward", "frequency": {"$sum":1}}}])
	});
	// return wardSumResponse;
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
									console.log(i + " last item / rodent items " +  grids.length);
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

function getMongoQryString(getParams, gridId){
	var qry ;


	var qryArr =[];
		qryArr.push({'gridPts.grid_id':{'$in':[gridId]}});
			
	if(getParams["status"] && getParams["status"]!="All"){				
		qryArr.push({"status":getParams["status"]});
	}

	if(getParams["startdate"]){
		var startdate = getParams["startdate"];
		qryArr.push({"create_date_epoch":{"$gte": new Date(startdate).getTime()}});		
	}

	if(getParams["enddate"]){
		var enddate = getParams["enddate"];
		qryArr.push({"create_date_epoch":{"$lte": new Date(enddate).getTime()}});		
	}

	if(qryArr.length==1){
		qry = JSON.stringify({"gridPts.grid_id":{"$in":[gridId]}});
	}else{
		qry = '{"$and":['; 	

		qryArr.forEach(function(element){
			// console.log(element);
			qry += JSON.stringify(element) + "," ;
		});
		// remove last comma
		qry = qry.slice(0, -1);
		qry+= "]}";
	}
	console.log(qry);
	// console.log("buffalo");
	return JSON.parse(qry);
}

function findNearbyGridPointsAndSum(gridId, getParams, callback){
	// console.log("here we are");
	var collectionName = getParams["type"];


			db.collection(collectionName, function(err, collection){
				var qry = getMongoQryString(getParams, gridId);
				
				collection.find(qry).toArray(function(err, rod_items){
					if(rod_items){
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
					}
					// console.log(gridId + " " + gridSum['81-56']);
					callback(null, rod_items);
				});
				// loop through gridPts if it matches entry.grid_id, add it to gridSum
			});
	
};