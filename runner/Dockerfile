FROM --platform=linux/amd64 summerwind/actions-runner-dind:latest 

# SHELL ["/bin/bash", "--login", "-c"]
WORKDIR $HOME

RUN sudo apt-get update \
  && sudo apt-get install -y \
  apt-transport-https \
  ca-certificates \
  groff \
  less \
  libssl-dev \
  xz-utils \
  && sudo rm -rf /var/lib/apt/lists/*

# go
ENV GO_VERSION 1.18.3
RUN curl -Lf "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o "go.tar.gz" \
  && sudo tar -C /usr/local -xzf go.tar.gz \
  && rm -f go.tar.gz \
  && export PATH=/usr/local/go/bin:$PATH

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip \
  && export AWS_PAGER=""

# node
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION v16
ENV NVM_VERSION 0.39.1
RUN sudo mkdir -p ${NVM_DIR} \
  && sudo chown runner ${NVM_DIR} \
  && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v${NVM_VERSION}/install.sh | bash \
  && . ${NVM_DIR}/nvm.sh \
  && nvm install ${NODE_VERSION} \
  && nvm use --delete-prefix ${NODE_VERSION} \
  && npm install -g \
  lerna \
  semantic-release \
  ts-node \
  typescript \
  yarn \
  && export PATH=/usr/local/nvm/versions/node/$(nvm current)/bin:$PATH

# persist path
RUN echo PATH=$PATH | sudo tee --append /etc/environment
