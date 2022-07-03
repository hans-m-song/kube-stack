#!/bin/bash

./init-vlan.sh

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=${DOCKER_NETWORK_IP_ADDRESS} --flannel-iface=${DOCKER_ROUTING_INTERFACE_NAME}" sh -

helm repo add jetstack https://charts.jetstack.io
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm repo update

helm upgrade --install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.8.2 \
  --set installCRDs=true

helm upgrade --install \
  --namespace actions-runner-system \
  --create-namespace \
  --set "authSecret.create=true" \
  --set "authSecret.github_token=${GITHUB_PAT}" \
  --set "githubWebhookServer.enabled=true,githubWebhookServer.ports[0].nodePort=33080" \
  --wait actions-runner-controller actions-runner-controller/actions-runner-controller

helm install \
  --namespace minio \
  --set rootUser=${MINIO_USER},rootPassword=${MINIO_PASS} \
  --generate-name minio/minio

kubectl apply -f build
