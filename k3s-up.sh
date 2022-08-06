#!/bin/bash

set -euxo pipefail

# ./init-vlan.sh

curl -sfL https://get.k3s.io | sh -
# curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.1.250 --flannel-iface=eno1.vlan" sh -

sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown -R $USER ~/.kube

./create-secrets.sh

helm upgrade argocd argo/argo-cd \
  --atomic \
  --install \
  --create-namespace \
  --namespace argocd \
  --set "server.extraArgs[0]=--insecure" \
  --set "server.config.accounts\.argocd=login" \
  --set "server.ingress.enabled=true" \
  --set "server.ingress.annotations.kubernetes\.io/ingress\.class=traefik" \
  --set "server.ingress.hosts[0]=argocd.k8s.axatol.xyz" \
  --set "dex.enabled=false" \
  --wait &&
  kubectl apply -f manifests
