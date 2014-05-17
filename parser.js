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
	// SyntaxError Exception Object
	var SyntaxError = function(message,at,text) {
		this.name = 'SyntaxError';
		this.at = at;
		this.text = text;
	};

	SyntaxError.prototype.toString = function() {
		return this.name + ' at line number ' + this.at + ': ' + this.text;
	};


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
	// Splits a line into a tokens object
	var tokenize = function(line) {
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
		var identity = ['identity','parent'];
		var authentication = ['authentication']

		var keywords = {
			'required':requirable,
			'mutable':mutable,
		};

		var settings = {
			'default':requirable,
			'level':authentication
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
		var setting = null;
		var setable = null;
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
				} else if (token.indexOf('=')>-1 && (setable=settings[setting=token.substr(0,token.indexOf('='))])) {
					//Token is a setting
					if(setable.indexOf(setting)) {
						setting = token.split('=');
						tokens[setting[0]] = setting[1];
					} else {
						tokens.error = "The setting '"+setting+"' cannot apply to a " + tokens.name;						
					}
				}

				//Next token
				token = '';
				space = false;
				setting = null;
				setable = null;
			}

			if (done) {
				//End of line!  Cleanup and return
				if(named) {
					line = trim(line.substr(idx).replace(/^\s*:/,''));
					tokens.description = line;
				} else {
					console.log(line);
					tokens = {type:'description',name:line};
				}
				return tokens;
			}
		}

		//Halting problem in-joke:
		return tokens;

	};

	// --------------------------------------------------------------
	// Parses the source
	var parse = function parse(source) {

		var api = [],
			stack = [],
			tokens = {},
			lines = [],
			line = '',
			i = 0,
			l = 0;

		//Throws a Syntax Error found while parsing
		var error = function(message) { throw new SyntaxError(message, i, line); };

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
			var obj = {name:tokens.name,resource:{}};
			if(tokens.description) obj.description = tokens.description;
			api.push(obj);
			stack = [{type:'resource',obj:obj}];
		};

		//Adds a new resource method
		var method = function(tokens) {
			var curr = popto('resource',"The method '"+tokens.name+"' does not apply to a resource.");
			var name = tokens.name;
			var obj = curr.resource[name];
			if(!obj) obj = curr.resource[name] = {};
			if(tokens.description) obj.description = tokens.description;

			stack.unshift({type:'method',obj:obj});
		};

		//Identity property, acts as a 'Primary Key' of an entry
		var identity = function(tokens){
			var curr = popto(['method','resource'],"The identity '"+tokens.name+"' does not apply to a method or resource.");
			curr.identity = curr.identity||[];
			var id = { name:tokens.name };
			curr.identity.push(id);

			if(tokens.length) id.description = tokens.join(' ');

			return id;
		};

		//Parent property, acts as a 'Foreign key' of an entry
		var parent = function(tokens) {
			var curr = popto('method');
			curr = curr||popto('resource',"The parent '"+line+"' does not apply to a method or resource.");
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
			curr = curr||popto('resource',"The mutable '"+line+"' does not apply to a method or resource.");
			curr.mutable = {ismutable:true};
			if(tokens.description) curr.mutable.description = tokens.description;
			return curr.mutable;
		};

		//Authentication property, denotes security access level required for the method
		var authentication = function(tokens){
			var curr = popto('method');
			curr = curr||popto('resource',"The authentication '"+line+"' does not apply to a method or resource.");
			curr.authentication = {level:tokens.level};
			if(tokens.description) curr.authentication.description = tokens.description;
			return curr.authentication;
		};

		//Adds a new method or resource property
		var property = function(tokens) {
			var keyword = tokens.name;
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
		var command = function(tokens) {
			var curr = popto('method',"The command '"+tokens.name+"' does not apply to a method.");
			curr.command = trim(line).replace(/^\{/,'').replace(/\}$/,'');
		};

		//Adds description text to current stack object
		var description = function(tokens) {
			var curr = stack[0].obj;
			curr.description = curr.description ? (curr.description+' '+tokens.name) : tokens.name;
		};

		//Composes a function to add a type of method request or response parameter
		var parameter = function(key,errormessage) {
			//Adds a method parameter item
			return function(tokens) {

				if(!tokens.name) error("A name is missing for '"+line+"'");
				if(!tokens.datatype) error("A datatype is missing for '"+tokens.name+"'");

				var curr = popto('method',errormessage.replace('%s',tokens.name));
				curr[key] = curr[key]||{};

				var name = tokens.name;
				var obj = curr[key][name];
				if(!obj) obj = curr[key][name] = {};
				stack.unshift({type:key,obj:obj});
				obj.type = tokens.datatype;
				if(tokens.require) obj.required = true;
				if(tokens.description) obj.description = tokens.description;
			}
		}

		//Declare method request parameter functions
		var route = parameter('params',"The route parameter '%s' does not apply to a method.");
		var query = parameter('query',"The querystring parameter '%s' does not apply to a method.");
		var body = parameter('body',"The body parameter '%s' does not apply to a method.");
		var file = parameter('files',"The file attachment '%s' does not apply to a method.");

		//Declate method response parameter functions
		var response = parameter('response',"The response field '%s' does not apply to a method.");

		//Loop through all the lines and parse the source
		for(i=0,l=lines.length;i<l;i++) {

			line = lines[i];

			tokens = tokenize(line);

			switch(tokens.type) {
				case 'resource': resource(tokens); break;
				case 'method': method(tokens); break;
				case 'route': route(tokens); break;
				case 'query': query(tokens); break;
				case 'body': body(tokens); break;
				case 'file': file(tokens); break;
				case 'command': command(tokens); break;
				case 'property': property(tokens); break;
				case 'response': response(tokens); break;
				case 'description': description(tokens); break;
				default: description(tokens); break;
			}

		}

		return api;

	};

	return parse;

})();

if(typeof module !== "undefined" && module.exports) {
  //Node
  module.exports = restlang;
} else if (typeof window!=="undefined") {
  //Browser
  window.restlang = restlang;
}