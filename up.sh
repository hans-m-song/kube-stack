#!/bin/bash

set -e
set -o pipefail

sudo kubeadm init \
    --pod-network-cidr=10.244.0.0/16 \ # for flannel
    --control-plane-endpoint $HOST

mkdir -p $HOME/.kube

sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

sudo chown $(id -u):$(id -g) $HOME/.kube/config

kubectl taint nodes --all node-role.kubernetes.io/master-

kubectl apply -f \
    https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

kubectl get configmap kube-proxy -n kube-system -o yaml | \
    sed -e "s/strictARP: false/strictARP: true/" | \
    kubectl apply -f - -n kube-system

kubectl apply -f \
    https://raw.githubusercontent.com/metallb/metallb/v0.10.2/manifests/namespace.yaml

kubectl apply -f \
    https://raw.githubusercontent.com/metallb/metallb/v0.10.2/manifests/metallb.yaml

kubectl create secret generic \
    -n metallb-system memberlist \
    --from-literal=secretkey="$(openssl rand -base64 128)"