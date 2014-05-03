//Module dependencies
var command = require('commander');
var restlang = require('./parser');
var fs = require('fs');

//Read in the package.json file:
var package = JSON.parse(fs.readFileSync(__dirname + "/package.json"));

command
	.version(package.version)
	.option('-i, --source <source>','The input file.')
	.option('-o, --target [target]','The output file. If missing, prints to stdout')
	.parse(process.argv);

if (!command.source) command.help();

// --------------------------------------------------------------------------

var parse = function(source) {

	var api = restlang(source);

	if (command.target) {
		fs.writeFileSync(command.target,api,'utf8');
	} else {
		console.log(JSON.stringify(api));
	}

};


try{

	fs.readFile(command.source,'utf8',function(err,source){
		if(err) {
			console.log(err);
			process.exit();
		}
		parse(source);
	});

} catch(ex) {

	console.error(ex);
	process.exit();

}
