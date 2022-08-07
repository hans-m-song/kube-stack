#!/bin/bash

set -euxo pipefail

mkdir -p bin

[ -f pre-up.sh ] && ./pre-up.sh

# setup with vlan
# ./init-vlan.sh
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.1.250 --flannel-iface=eno1.vlan" sh -
curl -sfL https://get.k3s.io | sh -
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown -R $USER ~/.kube

# initialise requisite helm repos
helm repo add jetstack https://charts.jetstack.io
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

helm upgrade cert-manager jetstack/cert-manager \
  --atomic \
  --install \
  --create-namespace \
  --namespace cert-manager \
  --set "installCRDs=true" \
  --wait

helm upgrade argocd argo/argo-cd \
  --atomic \
  --install \
  --create-namespace \
  --namespace argocd \
  -f argocd.values.yml \
  --wait

# download argocd cli
if [ ! -f ./bin/argocd ]; then
  curl -sSL -o ./bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
  chmod +x ./bin/argocd
fi

# download kubernetes kind filter
if [ ! -f ./bin/kfilt ]; then
  kfilt_latest_url=$(curl -s https://api.github.com/repos/ryane/kfilt/releases/latest | jq -j '.assets[].browser_download_url | select(test("linux_amd64"))')
  curl -Lo ./bin/kfilt $kfilt_latest_url && chmod +x ./bin/kfilt
fi

actions_runner_controller_crd_url=$(curl https://api.github.com/repos/actions-runner-controller/actions-runner-controller/releases | jq -j '[ .[] | select(.name | startswith("v")) ][0].assets[0].browser_download_url')
curl -L $actions_runner_controller_crd_url | ./bin/kfilt -i kind=CustomResourceDefinition | kubectl replace --force -f -

[ -f post-up.sh ] && ./post-up.sh
[ -f pre-apply.sh ] && ./pre-apply.sh

yarn install
yarn build

kubectl apply -f manifests

[ -f post-apply.sh ] && ./post-apply.sh
