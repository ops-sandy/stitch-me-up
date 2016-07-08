[![Build Status](https://travis-ci.org/diosmosis/stitch-me-up.svg?branch=master)](https://travis-ci.org/diosmosis/stitch-me-up)

# stitch-me-up

**stitch-me-up** (_stitch_ for short) is a command line tool that generates `docker-compose.yml` files for launching parts or all of a microservice ecosystem.

It lets you...
* launch a microservice that is automatically wired with mocks of it dependent microservices.
* launch a microservice with any number of other dependent microservices, without having to clone them manually.
* launch a microservice with local checkouts of its dependent microservices for full stack development in an SOA.
* non-intrusively create mocks, Dockerfiles and docker-compose specifications for microservices you *don't* control.
* _develop and test a microservice without having full knowledge or having a full deployment of the microservice's ecosystem._

## Installation & Setting Up

1. Install the package

  ```
  $ npm install -g stitch-me-up
  ```

2. Set up your microservice registry

  In order for stitch to know what your microservices are called, where they are and where their mocks are, you need to create a **microservice registry**.

  The registry is just a JSON object that maps microservice names to information about them. You can see an example of one here: [https://github.com/diosmosis/stitch-me-up-test-registry/blob/master/services.json](https://github.com/diosmosis/stitch-me-up-test-registry/blob/master/services.json)

  The registry can be in a git repo or it could be a file on a remote server or it could be the response from a live API. stitch doesn't care, just as long as it can be fetched from a URL. The easiest way to get started is to add it to a git repo. This makes it easy to change and easy to track changes.

3. Let stitch know about your registry

  When you've created your initial registry, let stitch know about it by setting the `STITCH_REGISTRY` environment variable in your `.bash_profile`. For example:

  ```
  export STITCH_REGISTRY="https://raw.githubusercontent.com/diosmosis/stitch-me-up-test-registry/master/services.json"
  ```

4. Specify your first microservice

  In the root of a microservice's git repo, add a `stitch.yml` file. You can see an example `stitch.yml` file here: https://github.com/diosmosis/stitch-me-up-test-microserviceA/blob/master/stitch.yml

  _NOTE: If you want to define dependencies for your microservices, you should make sure that you can launch the dependent service or that you have mocks for it._

## Usage

**Launching a microservice**

To launch a microservice, run the following command in the root directory for the microservice:

```
$ stitch
```

By default, stitch will resolve the microservice's dependencies to mocks. If you want to launch the service with a real dependency, use the `--with` parameter:

```
$ stitch --with=my-dependent-service --with=my-other-service#special-branch
```

When `--with` is used, stitch will look up the dependent services in the registry and clone them to `$HOME/.stitch`. If they already exist, the latest code is pulled.

If you want to launch a dependent service from a local checkout (so you can develop both services simultaneously), use the `--link` option:

```
$ stitch --link=/path/to/my/other/checkout
```

If the dependent services you launch have their own dependent services, those will be resolved to mocks (unless they are also specified w/ `--with` or `--link`).

**Generating a docker-compose.yml**

If you just want to generate a docker-compose.yml file, run stitch with the `--generate` option, like so:

```
$ stitch --generate
```

## Why?

**Why not use one docker-compose.yml file?**

If you have a limited number of services and these services all use docker, then you could get by with one docker-compose.yml file.

If, instead, you're working with a system w/ potentially hundreds of containers, launching all of them on one machine locally (or on a CI server) becomes impractical.

If you're working with a system where only part of it is under your control, and other parts do not use Docker, then creating a docker-compose.yml for the whole ecosystem is impossible.

stitch helps you do both of these things by allowing you to mock and dockerize services non-intrusively.

**Why not use compose-addons?**

[https://github.com/dnephin/compose-addons](https://github.com/dnephin/compose-addons) is a set of tools that generate docker-compose.yml files too, why not use that?

compose-addons contains some of the same functionality as stitch, but it doesn't provide the ability to resolve services to mocks and doesn't provide a unified, single command to launch services.

stitch does both of these things, plus it uses custom networks to wire containers together, without exposing private containers to other microservices. For example, a microservice that uses a redis instance, may not use the same redis instance another microservice uses in production. This should be replicated in development & testing.

And at the moment, it doesn't seem compatible w/ the latest docker-compose.

## Contribute

### Prerequisites

To develop stitch, you'll need the following:

* [node](https://nodejs.org/) version 4.2 or greater
* [docker](docker.com) version 1.12.0-rc1 or greater
* [docker-compose](https://docs.docker.com/compose/) version 1.8.0-rc1 or greater

### Getting set up

```
$ git clone https://github.com/diosmosis/stitch-me-up.git
$ cd stitch-me-up
$ npm install
```

### Running the tests

You can run the unit tests w/:

```
$ npm run test-unit
```

You can run the functional tests w/:

```
$ npm run test-functional
```

Note: the functional tests launch `docker-compose`, and so, take a fairly long time to run.

## TODO for this README

* need to document the registry object's format
* need to document the stitch.yml file format
