#!/bin/bash

set -euxo pipefail

mkdir -p bin

[ -f pre-up.sh ] && ./pre-up.sh

# install and configure nfs
# sudo apt-get update
# sudo apt-get install -y nfs-kernel-server
# sudo mkdir -p /mnt/data/nfs/k8s
# sudo chown -R nobody:nogroup /mnt/data/nfs
# cat <<EOF | sudo tee -a /etc/exports
# /mnt/data/nfs/k8s "$(hostname -I | awk '{print $1}')"(rw,sync,no_subtree_check,no_root_squash,anonuid=2000,anongid=2000)
# EOF
# sudo systemctl restart nfs-server.service
# sudo adduser nfs-client \
#   --disabled-login \
#   --shell /sbin/nologin \
#   --gecos "" \
#   --uid 2000 \
#   --gid 2000 \
#   --no-create-home

# setup with vlan
# ./init-vlan.sh
# curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--node-ip=192.168.1.250 --flannel-iface=eno1.vlan" sh -
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=stable sh -
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown -R $USER ~/.kube

# initialise requisite helm repos
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add jetstack https://charts.jetstack.io
helm repo add newrelic https://helm-charts.newrelic.com
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/
helm repo add portainer https://portainer.github.io/k8s/
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
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
# if [ ! -f ./bin/argocd ]; then
#   curl -sSL -o ./bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
#   chmod +x ./bin/argocd
# fi

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

sudo cp k3s/server/manifests/* /var/lib/rancher/k3s/server/manifests/
kubectl apply -f manifests

[ -f post-apply.sh ] && ./post-apply.sh
