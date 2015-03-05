var url = require("url");
var mongo = require('mongodb');

var numbers = [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
  queue = [];

var gridSum = {};
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

exports.censusBlockCnts = function(req, res) {
	console.log('getting censusBlockCnts');
	var _get = url.parse(req.url, true).query;
	// console.log('check for params' + _get["type"] + " - " + _get["startdate"] + " - " + _get["status"]);
	// get censusBlocks
	var collectionNames=['graffiti','potholes','rodent','sanViol','alley_light_out','street_light_out','aband_veh','bldg_inspection']
	var output = getAggregationByGeo('census_block',collectionNames);

	getMongoCensusBlocks(_get, function(err, results){
		results.features.forEach(function(censusBlock){
			var geoCnts = output[censusBlock.properties.census_block_value];
			
			if(geoCnts!=null){
				geoCnts.mostCommonComplaint = getMostCommonComplaint(geoCnts);

				geoCnts.census_block_value = censusBlock.properties.census_block_value;
				censusBlock.properties = geoCnts;
			}
		});
		res.send(JSON.stringify(results));	
	});	
};

module.exports.getMostCommonComplaint = getMostCommonComplaint;

 function getMostCommonComplaint(geoCnts){
	var highestValue=0;
	var retPropName="";
		for(var propt in geoCnts){
			if(geoCnts[propt]>highestValue){
				retPropName = propt;
				highestValue = geoCnts[propt];
			}
		}
		return retPropName;
};

exports.getAggregationByGeo = function(geoName, collectionNames){

	var geoCounts={};
	collectionNames.forEach(function(collName){
		db.collection(collName, function(err, collection){
		var qry ="[";
		
		qry += JSON.stringify({"$group": {"_id": "$" + geoName, "count": {"$sum":1}}});
		qry += "]";
		console.log(qry);
		qry = JSON.parse(qry);

		collection.aggregate(qry, function(err, items){
			items.forEach(function(item){
				var geo = geoCounts[item._id];
				if(geo==null){
					geo ={};
				}
				geo[collName] = item.count; 
				
				geoCounts[item._id] = geo;
				// console.log(item._id + "-" + geo);
			})
			});
		});
	});
 return geoCounts;
}

exports.geojson = function(req, res) {
	// var id = req.params.id;
	console.log('Retrieving geojson: ');
	
	var _get = url.parse(req.url, true).query;
	console.log('check for params' + _get["type"] + " - " + _get["startdate"] + " - " + _get["status"]);
	gridSum = {};
	gridSum["length"]=0;

	getSumValues(_get, function(err, features){
		console.log("number of features/grids " + features.length);

		res.send(JSON.stringify(createGeoJson(features)));

	});
};

function getArray(parameters, func){
	var collections =["abandoned_buildings", "potholes","rodent_baiting"];
	
 var i=0;
 var endCnt = 0;
 var lastItem = false;
 gridSum = {};
// call 
var qry = {"grid_id":{"$in":["67-54","67-55","67-56","67-57","67-58","67-59","67-60"]}};
qry = {};

			db.collection('gridpoints', function(err, collection){
					// collection.find({'row':40}).toArray(function(err, grids){
				collection.find(qry).toArray(function(err, grids){
					// db.collection('rodent_baiting', function(err, reqCollection){
						endCnt = grids.length*collections.length;
						console.log("endCnt [" + endCnt + "]");
						grids.forEach(function(grid){
							
							// for each gridid
							gridSum[grid.grid_id] = createEmptyGridObj(collections);

							var feat = createFunctionWithCollectionCnts("Feature",grid.grid_id, null, "Polygon",grid.geoCoordsJson, collections);
							
							collections.forEach(function(collectionName){
								findNearbyGridPointsAndSum(grid.grid_id, parameters, collectionName, function(err, value){
									
									feat.properties[collectionName] = value;
									gridSum[grid.grid_id] = feat;
									
									i++;
									if(endCnt==i){
										func(null, gridSum);
									}
								});	
						});

					});
				})

			})
};


module.exports.getWardSumsQuery = getWardSumsQuery;

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
	// console.log(qry);
	if(qry){
		return JSON.parse(qry);
	}
	return qry;
};

function getMongoCensusBlocks(params, func){
	var geoJson = {};
	geoJson["type"] = "FeatureCollection";
	var featureArray =[];
	var j=0;

	// call mongo to get all census blocks in json form and return
	db.collection("census_blocks", function(err, collection){
		collection.find().toArray(function(err,items){
			items.forEach(function(item){
				var geo ={};
				geo.geometry = item.geography;
				geo.type ="Feature";
				var prop={};
				prop.census_block_value = item.census_block_value;
				geo.properties =prop;
				// if(j<24){
					featureArray.push(geo);	
				// }
				j++;

			});
			geoJson["features"] = featureArray;
			return func(null, geoJson);
		});
	})
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

function createGeoJsonFromObject(featureObj){
	
	var geoJson = {};
	geoJson["type"] = "FeatureCollection";
	featureArray = [];
	for(var property in featureObj){
		if (featureObj.hasOwnProperty(property)) {
	        featureArray.push(featureObj[property]);
	    }
	}

	if(featureArray){
		geoJson["features"] = featureArray;
	}
	
	return geoJson;
};

function createGeoJson(featureArray){
	
	var geoJson = {};
	geoJson["type"] = "FeatureCollection";

	geoJson["features"] = featureArray;
	
	
	return geoJson;

};

function createFunctionWithCollectionCnts(type, name, value, geomType, geometryCoords, collections){
	var feature = createFeature(type, name, value, geomType, geometryCoords);

	var gridIdObj ={};
	gridIdObj.name = name;
	gridIdObj.value = value;
	for(var i=0; i< collections.length; i++){
		gridIdObj[collections[i]] = 0;
	}

	feature.properties = gridIdObj;
	return feature;
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

function createCensusBlock(type, name, value, geometry){
	var feature = {};
	feature["type"] = type;
	var properties = {};
	properties["name"] = name;
	properties["value"] = value;
	feature["properties"] = properties;
	
	feature["geometry"] = geometry;

	return feature;
};

function getSumValues(getParams, func) {
 var collections =["abandoned_buildings", "potholes","rodent_baiting"];
	
 var i=0;
 var features = [];
// call 
			db.collection('gridpoints', function(err, collection){
				collection.find().toArray(function(err, grids){
						grids.forEach(function(grid){
		
							findNearbyGridPointsAndSum(grid.grid_id, getParams, getParams["type"], function(err, value){
								
								if(value>0){
									var feat = createFeature("Feature",grid.grid_id, null, "Polygon",grid.geoCoordsJson);
									var feat_props ={"name": grid.grid_id,
															 "value": value};
									feat.properties = feat_props;
									features.push(feat);
								}	
									
								i++;
								if(i==grids.length){
									func(null, features);
								}
							});	

						});
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

function getDistWithRadius(dist, radius){
	var retDist =0;
	if(dist<radius){
		retDist = radius;
	}else{
		retDist =dist;
	}
	return retDist;
}


function getGridPtValFromList(rows, gridId, radiusFt, func){
	var sumFt =0;
	var sumInvFt =0;
	var targetGridDist;
	var retValue = 0;
	var gridPts = [];

	for(var i = 0, l= rows.length; i <l; i++){
		for(var p=0; p < rows[i].gridPts.length; p++){
			var gp = rows[i].gridPts[p];
			sumFt =+ getDistWithRadius(gp.distanceFt,radiusFt/2);
			if(gp.grid_id==gridId){
				targetGridDist= getDistWithRadius(gp.distanceFt,radiusFt/2);
			}
		}
		if(targetGridDist!=null){
			for(var p=0; p < rows[i].gridPts.length; p++){
				var gp = rows[i].gridPts[p];
				sumInvFt =+ sumFt/getDistWithRadius(gp.distanceFt,radiusFt/2);
			};
			retValue += sumFt/(targetGridDist*sumInvFt);
		};	
		
	};

	return func(null, retValue);
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

function createEmptyGridObj(collections){
	var gridIdObj ={};
	for(var i=0; i< collections.length; i++){
		gridIdObj[collections[i]] = 0;
	}

	return gridIdObj;
}

function findNearbyGridPointsAndSum(gridId, getParams, collName, callback){

			db.collection(collName, function(err, collection){
				var qry = getMongoQryString(getParams, gridId);
				
				collection.find(qry).toArray(function(err, rod_items){
					getGridPtValFromList(rod_items, gridId, 660, function(err, gridValue){
						// console.log(gridId + "[" + gridValue + "] " + collName);
						callback(null, gridValue);
					});

				});
			});
						
};
