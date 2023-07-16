#!/bin/bash

script_dir=$(cd $(dirname $0); pwd)

while true
do
  npx ts-node ${script_dir}/ratePosts.ts
  sleep 60
done
