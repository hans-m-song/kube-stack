FROM --platform=linux/amd64 summerwind/actions-runner-dind:latest 

# SHELL ["/bin/bash", "--login", "-c"]
WORKDIR ${HOME}

RUN sudo add-apt-repository ppa:git-core/ppa -y \
  && sudo apt-get update \
  && sudo apt-get install -y \
  apt-transport-https \
  build-essential \
  ca-certificates \
  curl \
  git \
  groff \
  jq \
  less \
  libssl-dev \
  wget \
  xz-utils

# go
ENV GO_VERSION 1.18.3
RUN curl -Lf "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o "go.tar.gz" \
  && sudo tar -C /usr/local -xzf go.tar.gz \
  && rm -f go.tar.gz

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip

# node
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v16
RUN sudo mkdir -p ${NVM_DIR} \
  && sudo chown runner ${NVM_DIR} \
  && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash \
  && . ${NVM_DIR}/nvm.sh \
  && nvm install ${NODE_VERSION} \
  && nvm use --delete-prefix ${NODE_VERSION} \
  && npm install -g \
  lerna \
  semantic-release \
  ts-node \
  typescript \
  yarn \
  && echo PATH=/usr/local/go/bin:/usr/local/nvm/versions/node/$(nvm current)/bin:$PATH | sudo tee --append /etc/environment
