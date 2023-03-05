FROM --platform=linux/amd64 summerwind/actions-runner-dind:ubuntu-22.04 

# SHELL ["/bin/bash", "--login", "-c"]
WORKDIR $HOME

RUN sudo apt-get update \
  && sudo apt-get install -y --no-install-recommends \
  apt-transport-https \
  ca-certificates \
  curl \
  groff \
  jq \
  less \
  libssl-dev \
  openssl \
  xz-utils \
  && sudo apt-get clean \
  && sudo rm -rf /var/lib/apt/lists/*

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip \
  && export AWS_PAGER=""

# kubectl
ARG KUBECTL_VERSION="v1.26.1"
RUN sudo curl -Lo /usr/local/bin/kubectl https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl \
  && sudo chmod +x /usr/local/bin/kubectl

# docker buildx
ARG DOCKER_BUILDX_VERSION="v0.10.1"
RUN mkdir -p $HOME/.docker/cli-plugins \
  && curl -Lo $HOME/.docker/cli-plugins/docker-buildx https://github.com/docker/buildx/releases/download/${DOCKER_BUILDX_VERSION}/buildx-${DOCKER_BUILDX_VERSION}.linux-amd64 \
  && chmod +x $HOME/.docker/cli-plugins/docker-buildx \
  && chown -R runner:docker $HOME/.docker

# helm
RUN sudo curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
  && sudo chmod +x get_helm.sh \
  && ./get_helm.sh \
  && sudo rm ./get_helm.sh
