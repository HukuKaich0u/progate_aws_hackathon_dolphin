use backend::{
    app::{router::create_router, state::AppState},
    config::AppConfig,
    infra::db::create_pool,
};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), backend::error::AppError> {
    tracing_subscriber::fmt::init();

    let config = AppConfig::from_env()?;
    let socket_addr = config.socket_addr()?;
    let db_pool = create_pool(&config.database_url).await?;
    let state = AppState { config, db_pool };
    let app = create_router(state.clone());
    let listener = TcpListener::bind(socket_addr)
        .await
        .map_err(sqlx::Error::Io)?;

    info!("backend listening on {}", state.config.socket_addr()?);

    axum::serve(listener, app).await.map_err(sqlx::Error::Io)?;

    Ok(())
}
