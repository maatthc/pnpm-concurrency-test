# PNPM

A "Fast, disk space efficient package manager" - https://pnpm.io/

With Pnpm you can "Save disk space and boost installation speed", as it "allows you to share dependencies of the same version across projects".

But can it be used in a shared/concurrent environment, such as in Continuous Integration agents?

## Goal

Test if multiple Docker container can read/update the Virtual Store simultaneously, without corrupting it.

## Prerequisite

You will need Bash/Docker/git installed on your machine.

## Local setup

On your local machine, create an empty folder to accommodate the shared Virtual Store:

`mkdir -p /tmp/.pnpm-store-initial`

## Scenario 1 : Install two different sets of packages in parallel

_Expected behavior_ : Should install packages on the shared Virtual Store (/tmp/.pnpm-store-initial) without corrupting it.

### Start the new Containers and Setup Pnpm on it

```
bash ./setup.sh parallel_1 &
bash ./setup.sh parallel_2 &
bash ./setup.sh parallel_3 &

```

### Trigger packages installation on the Containers in parallel using Pnpm

```
docker exec parallel_1 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_2 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_3 /bin/sh -c "cd /app; pnpm i" &

```

At the end you should see something similar to:

```

Progress: resolved 81, reused 2, downloaded 79, added 81, done
..
Progress: resolved 52, reused 0, downloaded 52, added 52, done

```

### Check if the application is working

Run on each one of the 3 containers:

`docker exec parallel_1 /bin/sh -c "node /app/src/index.js"`

The output should be similar to:

```

{
NODE_VERSION: '14.16.1',
HOSTNAME: '44b2cfd34975',
YARN_VERSION: '1.22.5',
HOME: '/root',
PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
PWD: '/'
}
^C

```

## Scenario 2 : Install a third different set of packages by itself

Expected behavior : Should reuse packages already installed on the shared Virtual Store and add the new requirements.

## Scenario 3 : Repeat the installation of the third set of packages

Expected behavior : Should reuse all packages already installed on the shared Virtual Store.

## Clean up

`docker kill parallel_1 parallel_2 parallel_3 standalone_1 standalone_2`

`docker container rm parallel_1 parallel_2 parallel_3 standalone_1 standalone_2`

`rm -Rf /tmp/.pnpm-store-initial`

## Next steps

Share the same Virtual Store in a BuiltKite agent and run multiple pipelines simultaneously.
