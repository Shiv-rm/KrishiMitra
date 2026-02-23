### Status
[![Build Status](https://travis-ci.org/chad-autry/request-response.svg?branch=master)](https://travis-ci.org/chad-autry/request-response)

## Synopsis

Assists with multiple text requests and responses across a read and write stream. Allows callbacks to be provided with any request. The callback will be invoked when a matching response is received.

The API is symmetric, both sides can initiate requests and receive responses.

## Code Example

Here is an example of setting up to listen for a single request, within Node.js, on stdin; and respond on stdout

```

process.stdin.setEncoding('utf8');
var requestHelper = new (require('request-response'))(process.stdin, process.stdout);

var requestCallback = function (requestId, requestBody) {
    /*Perform logic here */
    requestHelper.writeResponse(requestId, "response body")
};

requestHelper.once('request', requestCallback);
```


## Motivation

I wanted to programatically communicate between a child and parent process using stdin and stdout, but could not find a convenient library to do so.

## Installation

Installed from [npm](https://www.npmjs.com/package/request-response)

Installation is as simple as

```
npm install --save request-response
```

## API Reference

[JSDoc](http://chad-autry.github.io/request-response/)