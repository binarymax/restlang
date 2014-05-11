/****************************************************************************
*
* restlang - A parser for a DSL for describing REST resources
* (c)Copyright 2014, Max Irwin
* MIT License
*
****************************************************************************/
var restlang = (function() {
"use strict";

	var datatypes = [
 		'binary',
 		'boolean',
 		'byte',
 		'datetime',
 		'decimal',
 		'double',
 		'single',
 		'float',
 		'guid',
 		'int16',
 		'int32',
 		'int64',
 		'int',
 		'number',
 		'sbyte',
 		'string',
 		'text',
 		'time',
 		'datetimeoffset'
	];

	var rxStringN = /string(\d)+/i;

	// --------------------------------------------------------------
	// Trims whitespace
	var trim = function(text) { 
		if (!text||!text.length) return '';
		return (text
			.replace(/\n+/g,'\n')
			.replace(/^\s+/g,'')
			.replace(/\s+$/g,'')
			.replace(/\n\s+/g,'\n')
			.replace(/\s+\n/g,'\n')
		);
	};

	// --------------------------------------------------------------
	// Splits a line into tokens
	var tokenize = function(text) {
		return text.substr(1).split(/[\s:]+/);
	};

	// --------------------------------------------------------------
	// Splits a line into a tokens object
	var tokenize2 = function(line) {
		var tokens = {};
		var idx = 0;
		var len = line.length||0;
		var chr = '';
		var types = {
			'/': 'resource',
			'#': 'method',
			':': 'route',
			'?': 'query',
			'@': 'body',
			'$': 'file',
			'{': 'command',
			'.': 'property',
			'|': 'response'
		};

		var requirable = ['route','query','body','file'];
		var typeable = ['route','query','body','response'];
		var mutable = ['resource','method'];

		var keywords = {
			'required':requirable,
			'mutable':mutable
		};

		if (len) {
			//Get Symbol and line type
			chr = line.charAt(0);
			tokens.symbol = chr;
			tokens.type = types[chr];
		}

		if(!tokens.type) {
			//Description.  Return whole line;
			tokens.type = 'description';
			tokens.name = line;
			return tokens;
		}

		var named = false;
		var done = false;
		var space = false;
		var datatype = '';
		var token = '';
		var keyword = null;
		while (!done) {

			//Next character in line
			idx++;
			chr = (idx<len) ? line.charAt(idx) : '\n';

			//State machine to decide what to do with the next character
			switch (chr) {
				case ' ' : token = trim(token); space = true; break;
				case '\t': token = trim(token); space = true; break;
				case ':' : token = trim(token); space = true; done = true; break;
				case '\n': token = trim(token); space = true; done = true; break;
				default: token+=chr.toLowerCase(); break;
			}

			if (space && token.length) {
				//Whitespace detected! Finalize token

				if(!named) {
					//Token is the first thing following the symbol
					tokens.name = token;
					named = true;

				} else if (keyword  = keywords[token]) {
					//Token is a keyword
					if(keyword.indexOf(tokens.type)>-1) {
						tokens[token] = true;
					} else {
						tokens.error = "The keyword '"+token+"' cannot apply to a " + tokens.type;
					}

				} else if (datatypes.indexOf(token)>-1 || rxStringN.test(token)) {
					//Token is a datatype
					if(typeable.indexOf(tokens.type)>-1) {
						tokens.datatype = token;
					} else {
						tokens.error = "The datatype '"+token+"' cannot apply to a " + tokens.type;
					}
				}

				//Next token
				token = '';
				space = false;
			}

			if (done) {
				//End of line!  Cleanup and return
				if(named) {
					tokens.description = line.substr(idx);
				} else {
					tokens = {type:'description',name:line};
				}
				return tokens;
			}
		}

		//Spot the futility of this statement:
		return tokens;

	};

	//Parses the source
	var parse = function parse(source) {

		var api = [],
			char = null,
			stack = [],
			tokens = [],
			lines = [],
			line = '',
			i = 0,
			l = 0;

		//Throws a Syntax Error found while parsing
		var error = function(message) {
			throw { name:'SyntaxError', message:message, at:i, text:line };
		};

		source = trim(source);

		if (!(typeof source ==='string' && source.length)) error('The source is empty.');

		lines = source.split('\n');

		if (!lines.length) error('The source is empty.',0,'');

		//Pops the stack until it reaches an object of the specified type
		var popto = function(type,errormessage){
			if (type instanceof Array) {
				//get the first in the type list
				while(stack.length && type.indexOf(stack[0].type)===-1) stack.shift();			
			} else {
				//match the type string
				while(stack.length && stack[0].type!==type) stack.shift();
			}
			if  (!stack.length) {
				if(errormessage) error(errormessage);
				else return null;
			}
			return stack[0].obj;
		};

		//Adds a new API resource
		var resource = function(tokens) {
			var name = tokens.shift().toLowerCase();
			var obj = {name:name,description:tokens.join(' '),resource:{}};

			api.push(obj);
			stack = [{type:'resource',obj:obj}];
		};

		//Adds a new resource method
		var method = function(tokens) {
			var curr = popto('resource',"The method '"+tokens[0]+"' does not apply to a resource.");
			var name = tokens.shift().toUpperCase();
			var obj = curr.resource[name];
			if(!obj) obj = curr.resource[name] = {};
			if(tokens.length) obj.description = tokens.join(' ');

			stack.unshift({type:'method',obj:obj});
		};

		//Identity property, acts as a 'Primary Key' of an entry
		var identity = function(tokens){
			var curr = popto(['method','resource'],"The command '"+line+"' does not apply to a method or resource.");
			curr.identity = curr.identity||[];
			var id = { name:tokens.shift().toLowerCase() };
			curr.identity.push(id);

			if(tokens.length) id.description = tokens.join(' ');

			return id;
		};

		//Parent property, acts as a 'Foreign key' of an entry
		var parent = function(tokens) {
			var curr = popto('method');
			curr = curr||popto('resource',"The command '"+line+"' does not apply to a method or resource.");
			if(tokens.length===0) error("A parent resource is missing for '"+line+"'");
			if(tokens.length===1) error("A parent id is missing for '"+tokens[0]+"'");
			curr.parent = curr.parent||[];
			var rsrc = tokens.shift().toLowerCase();
			var name = tokens.shift().toLowerCase();
			var prnt = { resource: rsrc, name: name };
			curr.parent.push(prnt);

			if(tokens.length) prnt.description = tokens.join(' ');

			return prnt;
		};

		//Mutable property, marks that the entity state will change when method is called
		var mutable = function(tokens) {
			var curr = popto('method');
			curr = curr||popto('resource',"The command '"+line+"' does not apply to a method or resource.");
			curr.mutable = {ismutable:true};
			if(tokens.length) curr.mutable.description = tokens.join(' ');			
			return curr.mutable;
		};

		//Authentication property, denotes security access level required for the method
		var authentication = function(tokens){
			var curr = popto('method');
			curr = curr||popto('resource',"The command '"+line+"' does not apply to a method or resource.");
			if(tokens.length===0) error("An authentication level is missing for '"+line+"'");
			var level = tokens.shift();
			curr.authentication = {level:level};
			if(tokens.length) curr.authentication.description = tokens.join(' ');			
			return curr.authentication;
		};

		//Adds a new method or resource property
		var property = function(tokens) {
			var keyword = tokens.shift().toLowerCase();
			var obj = null;
			switch (keyword) {
				case 'identity': obj = identity(tokens); break;
				case 'parent': obj = parent(tokens); break;
				case 'mutable': obj = mutable(tokens); break;
				case 'authentication': obj = authentication(tokens); break;
				default: error("The keyword '"+keyword+"' was not recognised."); break;
			}
			if(obj) stack.unshift({type:'property',obj:obj});

		}

		//Adds an external command reference
		var command = function(line) {
			var curr = popto('method',"The command '"+line+"' does not apply to a method.");
			var external = line.replace(/[{}]/g,'').split(':');
			if (external.length!==2) error("The command format '"+line+"' was not recognised");
			curr.command = {file:external[0],method:external[1]};
		};

		//Adds description text to current stack object
		var description = function(line) {
			var curr = stack[0].obj;
			curr.description = curr.description ? (curr.description+' '+line) : line;
		};

		//Composes a function to add a type of method request or response parameter
		var parameter = function(key,errormessage) {
			//Adds a method parameter item
			return function(tokens) {
				if(tokens.length===1) error("A datatype is missing for '"+tokens[0]+"'");
				var curr = popto('method',errormessage.replace('%s',tokens[0]));
				var name = tokens.shift().toLowerCase();
				curr[key] = curr[key]||{};
				var obj = curr[key][name];
				if(!obj) obj = curr[key][name] = {};
				stack.unshift({type:key,obj:obj});
				obj.type = tokens.shift();
				if(tokens.length && tokens[0]==='required') {
					obj.required=true;
					tokens.shift();
				}
				if(tokens.length) obj.description = tokens.join(' ');
			}
		}

		//Declare method request parameter functions
		var param = parameter('params',"The route parameter '%s' does not apply to a method.");
		var query = parameter('query',"The querystring parameter '%s' does not apply to a method.");
		var body = parameter('body',"The body parameter '%s' does not apply to a method.");
		var file = parameter('files',"The file attachment '%s' does not apply to a method.");

		//Declate method response parameter functions
		var response = parameter('response',"The response field '%s' does not apply to a method.");

		//Loop through all the lines and parse the source
		for(i=0,l=lines.length;i<l;i++) {
			line = lines[i];
			char = line.charAt(0);

			tokens = tokenize(line);

			console.log(tokenize2(line));

			switch(char) {
				case '/': resource(tokens); break;
				case '#': method(tokens); break;
				case ':': param(tokens); break;
				case '?': query(tokens); break;
				case '@': body(tokens); break;
				case '$': file(tokens); break;
				case '{': command(line); break;
				case '.': property(tokens); break;
				case '|': response(tokens); break;
				default: description(line); break;
			}

		}

		return api;

	};

	return parse;

})();

//TODO - make this node agnostic
module.exports = restlang;