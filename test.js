"use strict";

var fs = require('fs');
var should = require('should');
var restlang = require('./parser');

describe('Restlang Tokenizer',function() {

	var testTokens = function(tokens,type,name,description) {
		tokens.should.be.an.object;
		tokens.should.have.property('type');
		tokens.type.should.be.equal(type);

		tokens.should.have.property('name');
		tokens.name.should.be.equal(name);

		if(description) {
			tokens.should.have.property('description');
			tokens.description.should.be.equal(description);
		} else {
			tokens.should.not.have.property('description');
		}
	};

	var testParameters = function(tokens,datatype,required,nested) {
		tokens.should.have.property('datatype');
		tokens.datatype.should.be.equal(datatype);
		restlang.datatypes.indexOf(datatype).should.be.above(-1);

		if(required) {
			tokens.should.have.property('required');
			tokens.required.should.be.equal(true);
		} else {
			tokens.should.not.have.property('required');			
		}

		if(nested) {
			tokens.should.have.property('nested');
			tokens.nested.should.be.equal(nested);
		} else {
			tokens.should.not.have.property('nested');
		}

	}

	it('should tokenize a plain resource',function(){

		var tokens = restlang.tokenize('/todo');
		testTokens(tokens,'resource','todo');

	});

	it('should tokenize a resource with a description',function(){

		var tokens = restlang.tokenize('/todo: The Todo List');
		testTokens(tokens,'resource','todo','The Todo List');

	});

	it('should tokenize a plain method',function(){
		
		var tokens = restlang.tokenize('#Get');
		testTokens(tokens,'method','get');

	});

	it('should tokenize a method with a description',function(){
		
		var tokens = restlang.tokenize('#Get: The Get Method');
		testTokens(tokens,'method','get','The Get Method');

	});

	it('should return an unaltered description',function(){
		
		var tokens = restlang.tokenize('The quick brown fox jumps over the lazy dog.');
		testTokens(tokens,'description','The quick brown fox jumps over the lazy dog.');

	});

	it('should return a typed route parameter',function(){
		
		var tokens = restlang.tokenize(':id int64');
		testTokens(tokens,'param','id');
		testParameters(tokens,'int64');

	});

	it('should return a required typed route parameter',function(){
		
		var tokens = restlang.tokenize(':id int64 required');
		testTokens(tokens,'param','id');
		testParameters(tokens,'int64',true);

	});

	it('should return a typed querystring parameter',function(){
		
		var tokens = restlang.tokenize('?isdone boolean');
		testTokens(tokens,'query','isdone');
		testParameters(tokens,'boolean');

	});

	it('should return a required typed querystring parameter',function(){
		
		var tokens = restlang.tokenize('?isdone boolean required');
		testTokens(tokens,'query','isdone');
		testParameters(tokens,'boolean',true);

	});


});

describe('Restlang Parser',function(){

	it('should parse the helloworld example',function(){

		var source = fs.readFileSync('./examples/helloworld.api','utf8');
		var helloworld = restlang(source);
		helloworld.should.be.an.object;
	});

	it('should parse the todo example',function(){

		var source = fs.readFileSync('./examples/todo.api','utf8');
		var todo = restlang(source);
		todo.should.be.an.object;
	});

	it('should parse the nested example',function(){

		var source = fs.readFileSync('./examples/nested.api','utf8');
		var nested = restlang(source);
		nested.should.be.an.object;
	});

	it('should parse the websocket chat example',function(){

		var source = fs.readFileSync('./examples/chat.api','utf8');
		var nested = restlang(source);
		nested.should.be.an.object;
	});

});