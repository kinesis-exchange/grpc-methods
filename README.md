<img src="https://sparkswap.com/img/logo.svg" alt="sparkswap - sparkswap.com" width="400">

[![CircleCI](https://circleci.com/gh/sparkswap/grpc-methods.svg?style=svg)](https://circleci.com/gh/sparkswap/grpc-methods)

Grpc Methods
============

Make writing Grpc Methods fun by using these handy wrappers

### Build Status
[![CircleCI](https://circleci.com/gh/kinesis-exchange/grpc-methods.svg?style=svg)](https://circleci.com/gh/kinesis-exchange/grpc-methods)

## Quickstart

1. Install

```
$ npm install --save kinesis-exchange/grpc-methods
```

2. Require

```
const { GrpcUnaryMethod } = require('grpc-methods')
```

3. Enjoy

```
const server = new grpc.Server()

server.addService(serviceDefinition, {
  myMethod: new GrpcUnaryMethod(myMethod).register()
})
```

## [API Reference](http://grpc-methods.kinesis.engineering)

## [Git Repository](http://github.com/kinesis-exchange/grpc-methods)
