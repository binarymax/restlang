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
		'date',
		'time',
		'datetimeoffset',
		'object',
		'array'
	];

	var verbs = [
		'OPTIONS',
		'GET',
		'HEAD',
		'POST',
		'PUT',
		'PATCH',
		'DELETE',
		'TRACE',
		'CONNECT',

		//WebDAV
		'PROPFIND',
		'PROPPATCH',
		'MKCOL',
		'COPY',
		'MOVE',
		'LOCK',
		'UNLOCK',
		'VERSION-CONTROL',
		'REPORT',
		'CHECKOUT',
		'CHECKIN',
		'UNCHECKOUT',
		'MKWORKSPACE',
		'UPDATE',
		'LABEL',
		'MERGE',
		'BASELINE-CONTROL',
		'MKACTIVITY',
		'ORDERPATCH',
		'ACL',
		'PATCH',
		'SEARCH',
		'BCOPY',
		'BDELETE',
		'BMOVE',
		'BPROPFIND',
		'BPROPPATCH',
		'NOTIFY',
		'POLL',
		'SUBSCRIBE',
		'UNSUBSCRIBE',
		'X-MS-ENUMATTS'
	];

	var verbmap = {
		'ENTRY':'GET',
		'COLLECTION':'GET',
		'ADD':'POST',
		'SAVE':'PUT',
		'REMOVE':'DELETE'
	};

	var rxStringN = /string(\d)+/i;
	var reWord = /(\w+)/i;

	var symbols = {
		'/': {name:'resource',expr:/^([\/]+)/},
		'#': {name:'method',expr:/^([\#]+)/},
		':': {name:'param',expr:/^([\:]+)/},
		'?': {name:'query',expr:/^([\?]+)/},
		'@': {name:'body',expr:/^([\@]+)/},
		'$': {name:'file',expr:/^([\$]+)/},
		'{': {name:'command',expr:/^([\{]+)/},
		'.': {name:'property',expr:/^([\.]+)/},
		'|': {name:'response',expr:/^([\|]+)/},
		'>': {name:'receiver',expr:/^([\>]+)/},
		'<': {name:'emitter',expr:/^([\<]+)/}
	};


	// --------------------------------------------------------------
	// SyntaxError Exception Object
	var SyntaxError = function(message,at,text) {
		this.name = 'SyntaxError';
		this.message = message;
		this.at = at;
		this.text = text;
	};

	SyntaxError.prototype.toString = function() {
		return this.message + ' :: ' + this.name + ' at line number ' + this.at + ': ' + this.text;
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
			.replace(/\t+/g,' ')
		);
	};

	// --------------------------------------------------------------
	// Splits a line into a tokens object
	var tokenize = function(line) {
		var tokens = {};
		var idx = 0;
		var len = line.length||0;
		var chr = '';

		var requirable = ['param','query','body','file'];
		var typeable = ['param','query','body','response'];
		var nestable = ['resource','query','body','response'];
		var mutable = ['resource','method'];
		var identity = ['identity','parent'];
		var authentication = ['authentication'];

		var keywords = {
			'required':requirable,
			'mutable':mutable
		};

		var settings = {
			'default':requirable,
			'level':authentication
		};


		if (len) {
			//Get Symbol and line type
			chr = line.charAt(0);
			tokens.symbol = chr;
			tokens.type = symbols[chr]&&symbols[chr].name;
		}

		if(!tokens.type) {
			//Description.  Return whole line;
			tokens.type = 'description';
			tokens.name = line;
			return tokens;

		}

		if (nestable.indexOf(tokens.type)>-1) {
			//Check for multiple symbols
			if (!symbols[chr]) {
				//Construct repeating symbols regex
				symbols[chr] = {name:"nested"+chr,expr:new RegExp('^([\\' + chr + ']+)')};
			}

			var nested = symbols[chr].expr.exec(line);
			if (nested && nested.length && nested[0].length>1) {
				tokens.nested = nested[0].length;
				line = line.substr(tokens.nested-1);
			}
		}


		var named = false;
		var done = false;
		var space = false;
		var datatype = '';
		var token = '';
		var setting = null;
		var setable = null;
		var verb = null;
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

					if (tokens.type==='method') {
						verb = tokens.name.toUpperCase();
						if (verbs.indexOf(verb)>-1) {
							tokens.verb = verb;
						} else if (verbmap[verb]) {
							tokens.verb = verbmap[verb];
						} else {
							tokens.error = "The HTTP verb '" + tokens.name + "' is invalid.";
						}
					}

				} else if (identity.indexOf(tokens.name)>-1) {
					//Token belongs to an identity
					tokens.identity = token;

				} else if (keywords[token]) {
					//Token is a keyword
					if(keywords[token].indexOf(tokens.type)>-1) {
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
					if (line.length) tokens.description = line;
				} else {
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
			if (!stack.length) {
				if(errormessage) error(errormessage);
				else return null;
			}
			return stack[0].obj;
		};

		var specifiers = {};

		//Adds a new API resource
		var resource = specifiers.resource = function(tokens) {
			var obj = {name:tokens.name,type:'resource',path:'/'+tokens.name,methods:[]};
			if(tokens.description) obj.description = tokens.description;
			api.push(obj);
			stack = [{type:'resource',obj:obj}];
		};

		//Adds a new Websocket API Receiver
		var receiver = specifiers.receiver = function(tokens) {
			var obj = {name:tokens.name,type:'receiver',receiver:{}};
			if(tokens.description) obj.description = tokens.description;
			api.push(obj);
			stack = [{type:'receiver',obj:obj}];
		};

		//Adds a new Websocket API Emitter
		var emitter = specifiers.emitter = function(tokens) {
			var obj = {name:tokens.name,type:'emitter',emitter:{}};
			if(tokens.description) obj.description = tokens.description;
			api.push(obj);
			stack = [{type:'emitter',obj:obj}];
		};

		//Adds a new resource method
		var method = specifiers.method = function(tokens) {
			var curr = popto('resource',"The method '"+tokens.name+"' does not apply to a resource.");
			var name = tokens.name;
			var obj = {};
			obj.name  = name;
			obj.path = curr.path;
			obj.verb = tokens.verb;
			if(tokens.description) obj.description = tokens.description;
			curr.methods.push(obj);

			stack.unshift({type:'method',obj:obj});
		};

		//Identity property, acts as a 'Primary Key' of an entry
		var identity = specifiers.identity = function(tokens){
			var curr = popto(['method','resource'],"The identity '"+tokens.name+"' does not apply to a method or resource.");
			curr.identity = curr.identity||[];
			var id = { name:tokens.identity };
			curr.identity.push(id);

			if(tokens.length) id.description = tokens.join(' ');

			return id;
		};

		//Parent property, acts as a 'Foreign key' of an entry
		var parent = specifiers.parent = function(tokens) {
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
		var mutable = specifiers.mutable = function(tokens) {
			var curr = popto('method');
			curr = curr||popto('resource',"The mutable '"+line+"' does not apply to a method or resource.");
			curr.mutable = {ismutable:true};
			if(tokens.description) curr.mutable.description = tokens.description;
			return curr.mutable;
		};

		//Authentication property, denotes security access level required for the method
		var authentication = specifiers.authentication = function(tokens){
			var curr = popto('method');
			curr = curr||popto('resource',"The authentication '"+line+"' does not apply to a method or resource.");
			curr.authentication = {level:tokens.level};
			if(tokens.description) curr.authentication.description = tokens.description;
			return curr.authentication;
		};

		//Adds a new method or resource property
		var property = specifiers.property = function(tokens) {
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

		};

		//Adds an external command reference
		var command = specifiers.command = function(tokens) {
			var curr = popto('method',"The command '"+tokens.name+"' does not apply to a method.");
			curr.command = trim(line).replace(/^\{/,'').replace(/\}$/,'');
		};

		//Adds description text to current stack object
		var description = specifiers.description = function(tokens) {
			var curr = stack[0].obj;
			curr.description = curr.description ? (curr.description+' '+tokens.name) : tokens.name;
		};

		//Composes a function to add a type of method request or response parameter
		var parameter = function(key,parents,errormessage) {
			//Adds a method parameter item
			return function(tokens) {

				if(!tokens.name) error("A name is missing for '"+line+"'");
				if(!tokens.datatype) error("A datatype is missing for '"+tokens.name+"'");

				var curr;
				if(tokens.nested) {
					curr = popto(key,errormessage.replace('%s',tokens.name));
				} else {
					curr = popto(parents,errormessage.replace('%s',tokens.name));
					if (curr.emitter) curr = curr.emitter;
					if (curr.receiver) curr = curr.receiver;
				}

				curr[key] = curr[key]||{};

				var name = tokens.name;
				var obj = curr[key][name];
				if(!obj) obj = curr[key][name] = {};
				stack.unshift({type:key,obj:obj});
				obj.type = tokens.datatype;
				if(tokens.require) obj.required = true;
				if(tokens.description) obj.description = tokens.description;

				//Method Params Only:
				if(curr.path && key==='params') curr.path += '/:'+name;
			};
		};

		//Declare method request parameter functions
		var param = specifiers.param = parameter('params','method',"The route parameter '%s' does not apply to a method.");
		var query = specifiers.query = parameter('query','method',"The querystring parameter '%s' does not apply to a method.");
		var body = specifiers.body = parameter('body',['method','receiver'],"The body parameter '%s' does not apply to a method or receiver.");
		var file = specifiers.file = parameter('files','method',"The file attachment '%s' does not apply to a method.");

		//Declare method response parameter functions
		var response = specifiers.response = parameter('response',['method','emitter'],"The response field '%s' does not apply to a method, emitter, or parent response object.");

		//Loop through all the lines and parse the source
		for(i=0,l=lines.length;i<l;i++) {

			line = lines[i];

			tokens = tokenize(line);

			if (tokens.error) error(tokens.error,i,line);
			if (!reWord.test(tokens.name)) error("The name can only contain letters or numbers",i,line);

			if (specifiers[tokens.type]) {
				specifiers[tokens.type](tokens);
			} else {
				description(tokens);
			}

		}

		//Final pass checks if everything is OK
		//TODO

		return api;

	};

	parse.tokenize = tokenize;
	parse.datatypes = datatypes;

	return parse;

})();

if(typeof module !== "undefined" && module.exports) {
  //Node
  module.exports = restlang;
} else if (typeof window!=="undefined") {
  //Browser
  window.restlang = restlang;
}