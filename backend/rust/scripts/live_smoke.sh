#!/usr/bin/env bash

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

: "${BACKEND_URL:?set BACKEND_URL}"
: "${TOKEN:?set TOKEN}"

ROOM_NAME="${ROOM_NAME:-General}"

auth_header="Authorization: Bearer ${TOKEN}"

echo "[0/5] health"
curl --silent --show-error --fail \
  "${BACKEND_URL}/health" | jq .

echo "[1/5] create room"
create_response="$(
  curl --silent --show-error --fail \
    -X POST "${BACKEND_URL}/v1/rooms" \
    -H "${auth_header}" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"${ROOM_NAME}\"}"
)"
echo "${create_response}" | jq .
room_id="$(echo "${create_response}" | jq -r '.room_id')"

echo "[2/5] get room"
curl --silent --show-error --fail \
  "${BACKEND_URL}/v1/rooms/${room_id}" \
  -H "${auth_header}" | jq .

echo "[3/5] join room"
join_response="$(
  curl --silent --show-error --fail \
    -X POST "${BACKEND_URL}/v1/rooms/${room_id}/join" \
    -H "${auth_header}"
)"
echo "${join_response}" | jq .

echo "[4/5] leave room"
curl --silent --show-error --fail \
  -X POST "${BACKEND_URL}/v1/rooms/${room_id}/leave" \
  -H "${auth_header}" \
  -o /dev/null
echo "leave ok"

echo "[5/5] get room after leave"
curl --silent --show-error --fail \
  "${BACKEND_URL}/v1/rooms/${room_id}" \
  -H "${auth_header}" | jq .
