'use strict'

const INITIAL_COMPOSE_CONTENTS = {
  version: '2',
  services: {},
  networks: {},
}

// TODO: we need to handle setup steps somehow... before launching?
class DockerComposeYmlGenerator {
  generate(registry, launchingService, realServices) {
    const contents = Object.assign({}, INITIAL_COMPOSE_CONTENTS)

    // TODO: visitServices
    registry.visitServices([launchingService].concat(realServices), (serviceName, serviceYml) => {
      // TODO
    })

    return contents
  }
}

module.exports = DockerComposeYmlGenerator
/*
PROCESSING STEPS:
 - gather services to launch (defaulting to mocks)      (BREADTH FIRST SEARCH)
   * set network properties & gather networks to create
   * namespace services (in depends_on & add links)
 - set global networks

version: '2'
services:
  cds_web:
    image: node:4
    ports:
      - "1337:1337"
    volumes:
      - .:/cds
      - ~/.aws:/root/.aws
    working_dir: /cds
    depends_on:
      - cds_dynamodb
      - cds_redis
    environment:
      - "AWS_PROFILE=${AWS_PROFILE}"
      - "AWS_REGION=${AWS_REGION}"
      - "NODE_ENV=test"
    command: [npm, start]
    networks:
      - default
      - cds_net
    links:
      - cds_dynamodb:dynamodb
      - cds_redis:redis
  cds_dynamodb:
    image: peopleperhour/dynamodb
    networks:
      - cds_net
  cds_redis:
    image: redis
    networks:
      - cds_net

  testMicrosvc_web:
    ...
    networks:
      - default
      - testMicrosvc_net
  testMicrosvc_postgres:
    image: ...
    networks:
      - testMicrosvc_net

  feature-flags_mocks:
    ...

networks:
  feature-flags_net:
  cds_net:
  testMicrosvc_net:
*/

/*
namespace: cds

public:
  - web

services:
  web:
    image: node:4
    ports:
      - "1337:1337"
    volumes:
      - .:/cds
      - ~/.aws:/root/.aws
    working_dir: /cds
    depends_on:
      - dynamodb
      - redis
    environment:
      - "AWS_PROFILE=${AWS_PROFILE}"
      - "AWS_REGION=${AWS_REGION}"
      - "NODE_ENV=test"
    command: [npm, start]
  dynamodb:
    image: peopleperhour/dynamodb
    ports:
      - "8000:8000"
  redis:
    image: redis
    ports:
      - "6379"

dependencies:
  - testMicrosvc
  - feature-flags

setup:
  - cd services && npm install
*/
