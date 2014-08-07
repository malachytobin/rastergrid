var express = require('express');
rastergrid = require('./routes/rastergrid');
 
var app = express();
 
//  app.configure(function () {
//     app.use(express.logger('dev'));     // 'default', 'short', 'tiny', 'dev' 
//     app.use(express.bodyParser());
// });

//set path to the views (template) directory
app.set('views', __dirname + '/views');
//set path to static files
app.use(express.static(__dirname + '/public'));
//handle GET requests on /
app.get('/', function(req, res){
	res.redirect('/home');
})
app.get('/grid', function(req, res){res.render('index.jade', {title: 'Raster Grid Demo'});});
app.get('/wardChart', function(req, res){res.render('sortTable.jade', {title:"Chicago 311 Service Requests By Ward"});});

app.get('/home', function(req, res){res.render('malachy.jade', {title:"Hello Everybody!"});});
app.get('/about', function(req, res){res.render('about.jade', {title:"Hello Everybody!"});});
app.get('/projects', function(req, res){res.render('projects.jade', {title:"Hello Everybody!"});});
app.get('/contact', function(req, res){res.render('contact.jade', {title:"Hello Everybody!"});});
// app.get('/*', function(req,res,next){
// 	res.header('Access-Control-Allow-Origin', '*');
// 	next();
// });

app.get('/rastergrid', rastergrid.geojson);
app.get('/wardSums', rastergrid.wardSums);
app.get('/slow', rastergrid.slow);
// app.get('/rastergrid/:id', rastergrid.findById);
// app.post('/rastergrid', wines.addWine);
// app.put('/rastergrid/:id', wines.updateWine);
// app.delete('/rastergrid/:id', wines.deleteWine);
 
app.listen(3000);
console.log('Listening on port 3000...');