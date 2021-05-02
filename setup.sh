#!/bin/bash

function pnpmSetup {
  docker run -d \
    -it \
    --name $1 \
    --mount type=bind,source=/tmp/.pnpm-store-initial,target=/.pnpm-store \
    node:14

  cd $1
  docker cp . $1:/app

  docker exec $1 /bin/sh -c "curl -f https://get.pnpm.io/v6.js | node - add --global pnpm@6"
  docker exec $1 /bin/sh -c "pnpm config set store-dir /.pnpm-store"
  cd ..

  docker ps
}

pnpmSetup $1
