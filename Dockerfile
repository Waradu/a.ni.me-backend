FROM ghcr.io/parkervcp/yolks:rust_latest

WORKDIR /

USER root
RUN apt-get update && apt-get install -y \
  libssl-dev \
  pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cargo build --release

EXPOSE 8000

CMD ["./target/release/web"]
