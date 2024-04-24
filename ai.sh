#!/usr/bin/env bash

set -e

dotenv_path="$(dirname "$(realpath "$0")")/.env"
index_ts_path="$(dirname "$(realpath "$0")")/src/cli/cli.app.ts"

if [ ! -f "$dotenv_path" ]; then
  echo "Error: .env file not found"
  exit 1
fi

bun --env-file="$dotenv_path" $index_ts_path