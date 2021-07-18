#!/bin/bash

set -e
set -o pipefail

# use default flannel cidr if not set
if [[ -z "$POD_CIDR" ]]; then POD_CIDR="10.244.0.0/16"; fi
echo "starting control plane using POD_CIDR=$POD_CIDR"
sudo kubeadm init \
    --pod-network-cidr=$POD_CIDR \
    --control-plane-endpoint=$HOST

echo "saving credentials"
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

echo "allowing workloads on master node"
kubectl taint nodes --all node-role.kubernetes.io/master-

