#!/usr/bin/env node

/****************************************************************************
*
* restlang - A parser for a DSL for describing REST resources
* (c)Copyright 2014, Max Irwin
* MIT License
*
****************************************************************************/

(require.main === module)
	? require('./command')                  // <-- ran from the command line
	: module.exports = require('./parser');	// <-- required as a node module