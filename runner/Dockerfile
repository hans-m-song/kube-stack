FROM --platform=linux/amd64 summerwind/actions-runner-dind:ubuntu-22.04 

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
  && sudo rm -rf /var/lib/apt/lists/* \
  && sudo apt clean

# aws cli
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscli.zip" \
  && unzip -q awscli.zip \
  && sudo ./aws/install \
  && rm -rf aws awscli.zip \
  && export AWS_PAGER=""
