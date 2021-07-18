#!/bin/bash

set -e
set -o pipefail

echo "shutting down control plane"
sudo kubeadm reset

echo "removing config files"
sudo rm -rf /etc/cni/net.d
sudo rm -rf /etc/kubernetes
sudo rm -rf $HOME/.kube

echo "flushing iptables"
sudo iptables --flush

echo "removing network interfaces"
sudo ip link del cni0
sudo ip link del flannel.1
