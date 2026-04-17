FROM rust:1.87-bookworm AS builder

WORKDIR /app/backend

COPY backend/Cargo.toml ./Cargo.toml
COPY backend/Cargo.lock ./Cargo.lock
COPY backend/src ./src
COPY backend/migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY --from=builder /app/backend/target/release/backend /usr/local/bin/backend

EXPOSE 3000

CMD ["backend"]
