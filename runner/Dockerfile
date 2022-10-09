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

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip \
  && export AWS_PAGER=""
