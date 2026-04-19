#!/bin/bash
set -euxo pipefail
exec > /var/log/user_data.log 2>&1

echo "=== user_data start $(date -u) ==="

dnf install -y docker
systemctl enable --now docker

# wait until the docker socket is ready
until docker info > /dev/null 2>&1; do
  sleep 2
done

aws ecr get-login-password --region ${region} \
  | docker login --username AWS --password-stdin ${registry}

# The image may not exist yet on the very first boot. Keep retrying until it does.
until docker pull ${image_uri}; do
  echo "image ${image_uri} not ready, sleeping 30s"
  sleep 30
done

docker run -d \
  --restart unless-stopped \
  --name hello \
  -p 8080:8080 \
  ${image_uri}

echo "=== user_data done $(date -u) ==="
