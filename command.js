// Module dependencies
var fs = require('fs');
var command = require('commander');
var restlang = require('./parser');

// --------------------------------------------------------------------------
// Read in the package.json file:
var package = JSON.parse(fs.readFileSync(__dirname + "/package.json"));

// --------------------------------------------------------------------------
// Initialize cli
command
	.version(package.version)
	.option('-i, --source <source>','The input file.')
	.option('-o, --target [target]','The output file. If missing, prints to stdout')
	.option('-p, --pretty','Pretty-print the JSON output')
	.parse(process.argv);

if (!command.source) command.help();

// --------------------------------------------------------------------------
// Pretty-print JSON
var pretty = function(obj) {
	return JSON.stringify(obj,undefined,2);
};

// --------------------------------------------------------------------------
// Run the parser and output the result
var parse = function(source) {

	var api = restlang(source);
	api.__metadata = {version : package.version};

	var out = command.pretty?pretty(api):JSON.stringify(api);

	if (command.target) {
		//Output to file
		fs.writeFile(command.target,out,'utf8',function(err){
			if(err) console.error(err);
			process.exit();
		});
	} else {
		//Output to stdout
		console.log(out);
		process.exit();
	}

};

// --------------------------------------------------------------------------
// Read in the file and parse
try {

	fs.readFile(command.source,'utf8',function(err,source){
		if(err) {
			console.error(err);
			process.exit();
		}
		parse(source);
	});

} catch(ex) {

	console.error(ex);
	process.exit();

}
