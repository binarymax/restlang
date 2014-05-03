/****************************************************************************
*
* restlang - A parser for a DSL for describing REST resources
* (c)Copyright 2014, Max Irwin
* MIT License
*
****************************************************************************/
var restlang = (function() {
"use strict";

	//Trims whitespace
	var trim = function(text) { 
		return (text
			.replace(/\n+/g,'\n')
			.replace(/^\s+/g,'')
			.replace(/\s+$/g,'')
			.replace(/\n\s+/g,'\n')
			.replace(/\s+\n/g,'\n'));
	};

	//Splits a line into tokens
	var tokenize = function(text) {return text.split(/[\s]+/); };

	//Parses the source
	var parse = function parse(source) {

		var api = [],
			char = null,
			stack = [],
			current = null,
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
			while(stack.length && stack[0].type!==type) stack.shift();
			if(!stack.length) error(errormessage);			
			return stack[0].obj;
		};

		//Adds a new API resource
		var resource = function(tokens) {
			var name = tokens[0].substr(1);
			var obj = {name:name};
			api.push(obj);
			stack = [{type:'resource',obj:obj}];
			current = stack[0];
		};

		//Adds a new resource method
		var method = function(tokens) {
			var curr = popto('resource',"The method '"+tokens[0]+"' does not apply to a resource.");
			var name = tokens[0].substr(1).toUpperCase();
			var obj = curr[name];
			if(!obj) obj = curr[name] = {};
			stack.unshift({type:'method',obj:obj});
		};

		//Adds a new resource method
		var param = function(tokens) {
			var curr = popto('method',"The route parameter '"+tokens[0]+"' does not apply to a method.");
			var name = tokens[0].substr(1).toLowerCase();
			curr.params = curr.params||{};
			var obj = curr.params[name];
			if(!obj) obj = curr.params[name] = {};
			stack.unshift({type:'param',obj:obj});

			obj.type = tokens[1];
		};

		//Adds a new resource method
		var query = function(tokens) {
			var curr = popto('method',"The querystring parameter '"+tokens[0]+"' does not apply to a method.");
			var name = tokens[0].substr(1).toLowerCase();
			curr.params = curr.params||{};
			var obj = curr.params[name];
			if(!obj) obj = curr.params[name] = {};
			stack.unshift({type:'query',obj:obj});
		};

		//Adds a new resource method
		var body = function(tokens) {
			var curr = popto('method',"The body parameter '"+tokens[0]+"' does not apply to a method.");
			var name = tokens[0].substr(1).toLowerCase();
			curr.params = curr.params||{};
			var obj = curr.params[name];
			if(!obj) obj = curr.params[name] = {};
			stack.unshift({type:'body',obj:obj});
		};

		//Adds a new resource method
		var file = function(tokens) {
			var curr = popto('method',"The file attachment '"+tokens[0]+"' does not apply to a method.");
			var name = tokens[0].substr(1).toLowerCase();
			curr.params = curr.params||{};
			var obj = curr.params[name];
			if(!obj) obj = curr.params[name] = {};
			stack.unshift({type:'file',obj:obj});
		};

		//Adds a new resource method
		var field = function(tokens) {
			var curr = popto('method',"The return field '"+tokens[0]+"' does not apply to a method.");
			var name = tokens[0].substr(1).toLowerCase();
			curr.params = curr.params||{};
			var obj = curr.params[name];
			if(!obj) obj = curr.params[name] = {};
			stack.unshift({type:'field',obj:obj});
		};

		var description = function(line) {
			var curr = stack[0].obj;
			curr.description = curr.description ? (curr.description+' '+line) : line;
		};

		//Loop through all the lines and parse the source
		for(i=0,l=lines.length;i<l;i++) {
			line = lines[i];
			char = line.charAt(0);

			tokens = tokenize(line);

			switch(char) {
				case '/': resource(tokens); break;
				case '@': method(tokens); break;
				case ':': param(tokens); break;
				case '?': query(tokens); break;
				case '-': body(tokens); break;
				case '|': field(tokens); break;
				case '$': file(tokens); break;
				default: description(line); break;
			}

		}

		return api;

	};

	return parse;

})();

//TODO - make this node agnostic
module.exports = restlang;