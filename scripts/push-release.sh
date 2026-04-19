#!/usr/bin/env bash

if [ -z "${RELEASE_VERSION}" ]; then
  RELEASE_VERSION="$(git rev-parse HEAD)"
fi

docker push "docker.io/freedomben/tamx-static:${RELEASE_VERSION}"
docker push "docker.io/freedomben/tamx-static:latest"
