FROM --platform=linux/amd64 summerwind/actions-runner-dind:ubuntu-22.04 

# SHELL ["/bin/bash", "--login", "-c"]
WORKDIR $HOME

RUN sudo apt-get update \
  && sudo apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  groff \
  jq \
  less \
  libssl-dev \
  openssl \
  xz-utils \
  && sudo rm -rf /var/lib/apt/lists/* \
  && sudo apt clean

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip \
  && export AWS_PAGER=""

# kubectl
ARG KUBE_VERSION="v1.26.1"
RUN sudo curl -Lo /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/${KUBE_VERSION}/bin/linux/amd64/kubectl \
  && sudo chmod +x /usr/local/bin/kubectl
