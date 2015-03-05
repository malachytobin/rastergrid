// spec/rastergrid-spec.js
// var util = require('../spec/test_utils.js');
var rewire = require("rewire");

var rastergrid = rewire("../routes/rastergrid.js");
// var rastergrid = util.expose("../routes/rastergrid.js");

describe("getMostCommonComplaint", function () {
  it("should return most commond complaint", function () {
  	var geoCnts = {};
  	geoCnts.rodentBaiting = 22;
  	geoCnts.vacantBuilding = 12;
  	geoCnts.abandonedVehicle = 21;
    var mostcommondComplaint = rastergrid.getMostCommonComplaint(geoCnts);
    expect(mostcommondComplaint).toBe('rodentBaiting');
	});

  it("empty input should return empty output", function () {
  	var geoCnts = {};
    var mostcommondComplaint = rastergrid.getMostCommonComplaint(geoCnts);
    expect(mostcommondComplaint).toBe('');
	});

  it("wierd input should return empty output", function () {
  	var geoCnts = {};
  	geoCnts.rodentBaiting ;
    var mostcommondComplaint = rastergrid.getMostCommonComplaint(geoCnts);
    expect(mostcommondComplaint).toBe('');
	});
  });

describe("getWardSumsQuery-should format the get parameters into a mongodb json find obj", function () {
  it("just a status get param", function () {
  	var params ={};
  	params.status = "Open";
  	var expectedQuery = '{"$match":{"$and":[{"status":"Open"}]}}';
	
    var qry = rastergrid.getWardSumsQuery(params);

    expect(JSON.stringify(qry)).toBe(expectedQuery);
	});

  it("status and start date", function () {
  	var params ={};
  	params.status = "Open";
  	params.startdate = "2014-02-10";

  	var expectedQuery = '{"$match":{"$and":[{"status":"Open"},{"create_date_epoch":{"$gte":1391990400000}}]}}';
	
    var qry = rastergrid.getWardSumsQuery(params);

    expect(JSON.stringify(qry)).toBe(expectedQuery);
	});
 
  });