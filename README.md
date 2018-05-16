# Grpc Methods

Make writing Grpc Methods fun by using these handy wrappers

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
  myMethod: new GrpcUnaryMethod(myMethod, '[myMethod]').register()
})
```

## [API Reference](http://grpc-methods.kinesis.engineering)

## [Git Repository](http://github.com/kinesis-exchange/grpc-methods)