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
	var tokenize = function(text) {
		return text.substr(1).split(/[\s:]+/);
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
			while(stack.length && stack[0].type!==type) stack.shift();
			if  (!stack.length) error(errormessage);			
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

			switch(char) {
				case '/': resource(tokens); break;
				case '#': method(tokens); break;
				case ':': param(tokens); break;
				case '?': query(tokens); break;
				case '@': body(tokens); break;
				case '$': file(tokens); break;
				case '{': command(line); break;
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