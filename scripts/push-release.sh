#!/usr/bin/env bash

if [ -z "${RELEASE_VERSION}" ]; then
  RELEASE_VERSION="$(git rev-parse HEAD)"
fi

docker push "docker.io/freedomben/emoji-spa-web:${RELEASE_VERSION}"
docker push "docker.io/freedomben/emoji-spa-web:latest"
