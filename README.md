# Restlang

A cross-compiling DSL (domain specific language) for building APIs

## Introduction

Restlang is a markdown-inspired language that is used to generate server route specifications, client libraries, testing scripts, and developer documentation for web based APIs.

For example, you can easily define a ToDo list API resource with 50 lines of restlang, and then automatically generate all of the following:
- The API routes for Node/Express 
- A jQuery AJAX library to consume the above API
- Integration test scrips for mocha
- Static HTML documentation files

## Example

Here is an example of a Todo list API in Restlang:

```
/todo: A Todo list CRUD API

.identity id int64

#Get: Gets a specific To-Do Item

	{../controllers/todo:Entry}

	:id int64 required: The ID of the item entry to retrieve

	|id int64: The ID of the item
	|description string: The textual description of the item
	|donedate datetime: The date/time when the item was marked as done, null otherwise
	|createdate datetime: The date the item was entered into the system
	|isdeleted boolean: True if the item has been removed from the list

#Get: Gets a list of Todo Items for a List

	{../controllers/todo:Collection}

	?isdone boolean: If true, only return done items, if false only return not done items
	?all boolean default false: if true, return all items, done or not

	|id int64: The ID of the item
	|description string: The textual description of the item
	|donedate datetime: The date/time when the item was marked as done, null otherwise
	|createdate datetime: The date the item was entered into the system
	|isdeleted boolean: True if the item has been removed from the list

#Post: Adds a new Todo Item to a List

	{../controllers/todo:Add}

	@description string required: The textual description of the item
	@donedate datetime: The date/time when the item was marked as done, null otherwise
	@createdate datetime: The date the item was entered into the system
	@redirect string: Redirect to this URL after Add
	
	|id int64: The ID of the newly added item
	|description string: The textual description of the item
	|donedate datetime: The date/time when the item was marked as done, null otherwise
	|createdate datetime: The date the item was entered into the system

#Put: Saves a specific Todo Item

	{../controllers/todo:Save}

	:id int64 required: The ID of the item entry to save

	@description string: The textual description of the item
	@donedate datetime: The date/time when the item was marked as done, null otherwise
	@createdate datetime: The date the item was entered into the system
	@redirect string: Redirect to this URL after Save				

	|id int64: The ID of the saved Todo item
	|description string: The textual description of the item
	|donedate datetime: The date/time when the item was marked as done, null otherwise
	|createdate datetime: The date the item was entered into the system

#Delete: Marks a specific Todo Item as deleted

	{../controllers/todo:Remove}

	:id int64 required: The ID of the item entry to remove

	|affectedRows: int32: The number of records effected by the removal

```

## Documentation

Writing restlang is easy, but it assumes you have at least a basic understanding of REST APIs and HTTP.  It is meant to be somewhat forgiving and flexible, and geared towards readability and documentation.

Restlang works by allowing you to declare resources, methods, request parameters, and response output in a human-readable format.  Restlang does not compile to machine language or bytecode - rather it is parsed into an intermediate JSON, and then the JSON can be used to generate any number of targets.

### Top-down flow

Restlang is parsed in a top-down flow.  When an entity is declared, it applies to the previous entity the next level up.  For example, a resource has methods, and methods have parameters.  When a method is declared, it applies to the most recently declared resource.  When a parameter is declared, it applies to the most recently declared method.

Restlang is driven off newlines and symbols, with a couple keywords thrown in.  A line that begins with one of the key symbols (defined below) is treated as the specified entity.  A line that begins with anything other than a symbol is treated as textual description for the most recently defined entity.

### Symbol Reference

This is the complete reference of symbols.  Any line beginning with one of these symbols is treated as specified:

-
#### ```/``` (slash resource)

The slash is used to define a top-level REST resource.  In our above ToDo example, the resource is defined as ```/todo```.  This means what it sounds like - that a server is expected to serve a resource via HTTP at /todo

-

#### ```#``` (hash method)
Defines an HTTP Resource access method.  You can either supply a verb (GET, POST, PUT, DELETE), or one of the Restlang methods (Entry, Collection, Add, Save, Remove).  More on the Restlang specific methods will be discussed later.

-

#### ```.``` (dot property)

This symbol is context specific.  A dot property can only apply to a resource or method, and must be coupled with one of the following keywords:

- identity
- parent
- authentication
- mutable

-

#### ```{``` (curly controller)

The curly is used as a reference point to an external and implementation specific controller to handle the resource.  Since Restlang is only used to define the API details, it is left to the target framework or language to implement how the request is fulfilled.  This is usually only used when generating the source code files for the server implementation.

_Note_: While not required, it is good format to end the line with a closing curly brace ```}```

-

#### ```:``` (route param)

The colon param is used as a route parameter.  For example, the ```:id int64 required``` param for the ```/todo``` GET resource, will serve a route that a client can GET at ```/todo/:id/```

-

#### ```?``` (query param)

The query param is used as a querystring parameter.  For example, the ```?isdone boolean``` param for the ```/todo``` GET resource, will serve a route that a client can GET at ```/todo/?isdone=true```

-

#### ```@``` (body param)

When a POST or PUT is sent, the body param is sent with the body of the request.

-

#### ```$``` (file param)

When a POST or PUT is sent, the file param is sent as a form attachment with the body of the request.

-

#### ```|``` (pipe output)

Pipe output denotes the outgoing response data.

-

### Parameter declarations

The route, query, body, file, and pipe parameters all have the same format:
```<symbol><name> <datatype> [required][default <value>]```

The symbol is one of the symbols above

The datatype is one of the datatypes below

The name is a variable type format: /[a-z]\w*/i

required and default cannot both be declared.  required overrides default.

- The ```id``` example from Todo Get:

 ```:id int64 required```

- The ```isdone``` example from Todo Get:

 ```?isdone boolean```

- The ```all``` example from Todo Get:

 ```?all boolean default false```

### 


## Datatypes

The datatype system is meant to be extensible, but supports the following defaults:

 - binary
 - boolean
 - byte
 - datetime
 - decimal
 - double
 - single
 - float (same as double)
 - guid
 - int16
 - int32
 - int64
 - int (same as int32)
 - number (same as int32)
 - sbyte
 - string
 - text (same as string)
 - stringN (where N is any integer greater than 0.  For example ```string255```)
 - time
 - datetimeoffset
 
### Custom datatypes

It is possible to extend the type system and define new datatypes to use in the API.

_coming soon_  

## Notes

Restlang is released under the MIT license.
Copyright Max Irwin, 2014

##### _made with love by Max Irwin (http://binarymax.com)_