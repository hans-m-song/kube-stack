#!/bin/bash

set -euxo pipefail

# setup with vlan
# ./init-vlan.sh
# curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.1.250 --flannel-iface=eno1.vlan" sh -

curl -sfL https://get.k3s.io | sh -

sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown -R $USER ~/.kube

./create-secrets.sh

helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
helm upgrade argocd argo/argo-cd \
  --atomic \
  --install \
  --create-namespace \
  --namespace argocd \
  -f argocd.values.yml \
  --wait &&
  kubectl apply -f manifests
