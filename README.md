# PNPM

A "Fast, disk space efficient package manager" - https://pnpm.io/

It makes use of a shared content-addressable **Virtual Store**, what can :
- "Save disk space and boost installation speed", by saving all files in a single place on the disk.
- "Allows you to share dependencies of the same version across projects".
- Store multiple versions of the same package on one location.
- "If you depend on different versions of the dependency, only the files that differ are added to the store."
- Ridiculously fast: https://pnpm.io/benchmarks

**But can it be used in a shared/concurrent environment, such as in Continuous Integration agents?**

## Goal

Test if multiple Docker containers can read/update the Virtual Store simultaneously, without corrupting it, as it would happen in a CI agent running concurrent pipelines.


## Versions

Tested with :

 - Amazon Linux 2: 4.14.231-173.360.amzn2.x86_64 - partition / type xfs (rw,noatime,attr2,inode64,noquota)
 - pnpm version 6.2.3
 - Docker 20.10.4, build d3cb89e
 
 And:
 
 - MacOs 10.14.6
 - pnpm version 6.2.3
 - Docker Desktop 3.3.1

## Prerequisite

You will need Bash/Docker/Git installed on your machine.

## Local setup

On your local machine:

- Clone this repo.
- Create an empty folder to accommodate the shared Virtual Store:

`mkdir -p /tmp/.pnpm-store-initial`

## Scenario 1 : Install five different sets of packages in parallel

Each folder (parallel_1, parallel_2 ...) contain a different package.json file : most of the dependencies are common among it and some are unique to each one.

**Expected behavior** : Should install packages on the shared Virtual Store (/tmp/.pnpm-store-initial) without corrupting it.

### Start the new Containers and Setup Pnpm on it

```
bash ./setup.sh parallel_1
bash ./setup.sh parallel_2 &
bash ./setup.sh parallel_3 &
bash ./setup.sh parallel_4 &
bash ./setup.sh parallel_5 &
```

### Trigger packages installation on the Containers in parallel using Pnpm

```
docker exec parallel_1 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_2 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_3 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_4 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_5 /bin/sh -c "cd /app; pnpm i" &
```

At the end you should see something similar to the bellow, for each container:

```
dependencies:
+ @hapi/joi 17.1.1 deprecated
+ aws-sdk 2.897.0
+ bluebird 3.7.2
+ coffee-script 1.12.7 deprecated
+ date-fns 2.21.1
+ lodash 4.17.21
+ moment 2.29.1
+ pino 6.11.3
+ request 2.88.2 deprecated
+ uuid 8.3.2
```

### Check if the application is working

Run on each one of the 5 containers:

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

## Scenario 2 : Install two different sets of packages in parallel

Ps: run the command at "Clean up" and "Local setup" before executing this scenario.

As we couln't run 5 containers in parallel using MacOs, lets try run only 2.

Each folder (parallel_1 and parallel_2) contain a different package.json file : most of the dependencies are common among it and some are unique to each one.

**Expected behavior** : Should install packages on the shared Virtual Store (/tmp/.pnpm-store-initial) without corrupting it.

### Start the new Containers and Setup Pnpm on it

```
bash ./setup.sh parallel_1 &
bash ./setup.sh parallel_2 &
```

### Trigger packages installation on the Containers in parallel using Pnpm

```
docker exec parallel_1 /bin/sh -c "cd /app; pnpm i" &
docker exec parallel_2 /bin/sh -c "cd /app; pnpm i" &
```

At the end you should see something similar to scenario 1.

### Check if the application is working

Similar to scenario 1.

## Scenario 3 : Install a third different set of packages by itself

**Expected behavior** : Should reuse packages already installed on the shared Virtual Store and add the new requirements.

### Start the new Containers and Setup Pnpm on it

```
bash ./setup.sh standalone_1
```

### Trigger packages installation on the Container

```
docker exec standalone_1 /bin/sh -c "cd /app; pnpm i"
```

You should find one line similar to:

`Progress: resolved 200, reused 52, downloaded 148, added 200, done`

That shows that 52 packages were reused and another 148 new packages were downloaded.

### Check if the application is working

Similar to scenario 1.

## Scenario 4 : Repeat the installation of the third set of packages

**Expected behavior **: Should reuse all packages already installed on the shared Virtual Store.

### Start the new Containers and Setup Pnpm on it

```
bash ./setup.sh standalone_2
```

### Trigger packages installation on the Container

```
docker exec standalone_2 /bin/sh -c "cd /app; pnpm i"
```

You should find one line similar to:

`Progress: resolved 200, reused 200, downloaded 0, added 200, done`

That shows that 200 packages were reused and no new packages were downloaded.

### Check if the application is working

Similar to scenario 1.

## Findings

### Scenario 1 : Empty Virtual Store and Five containers running

??? Linux: Works without issue.

???? MacOS: When the Virtual Store is empty (new server/agent) and we have 3 ou more containers running in parallel, at least one of it will fail with an error similar to:

```
ERROR??? EPERM: operation not permitted, open '/.pnpm-store/v3/files/1e/41f385cc153c21c206dd0849f0d4660b119e8782ab1b5d6b91c52bea0dab256c5c3ff0759a19a59285eebc9522de4a326614f5ddf9b2d6ae7015e78566f7c9'
```

This is a extreme case: the chances of 3 installation process being running in parallel with an empty Virtual Store are very remote.

Adding an 'pause' of 15 seconds between the executions seems to minimaze the issue.

An workaround would be implementing a simple 'retry' strategy such as:

```
retry() { eval "$*" || eval "$*" || eval "$*"}
retry docker exec parallel_1 /bin/sh -c "cd /app; pnpm i"
```


### Scenario 2 : Empty Virtual Store and two containers running

?????? Works without issue on both platforms.

### Scenario 3 : Existing Virtual Store and new packages required.

?????? Works without issue on both platforms.

### Scenario 4 : Existing Virtual Store and no new packages required.

?????? Works without issue on both platforms.

## Clean up

`docker kill parallel_1 parallel_2 parallel_3 standalone_1 standalone_2`

`docker container rm parallel_1 parallel_2 parallel_3 standalone_1 standalone_2`

`rm -Rf /tmp/.pnpm-store-initial`

## Next steps

Share the same Virtual Store in a CI agent and run multiple pipelines simultaneously.
