use backend::{
    app::{router::create_router, state::AppState},
    config::AppConfig,
    infra::{auth::default_token_verifier, chime::default_meeting_provider, db::create_pool},
};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> Result<(), backend::error::AppError> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let config = AppConfig::from_env()?;
    let socket_addr = config.socket_addr()?;
    let db_pool = create_pool(&config.database_url).await?;
    let state = AppState {
        config,
        db_pool,
        token_verifier: default_token_verifier(),
        meeting_provider: default_meeting_provider(),
    };
    let app = create_router(state.clone());
    let listener = TcpListener::bind(socket_addr)
        .await
        .map_err(backend::error::AppError::ServerIo)?;

    info!("backend listening on {}", state.config.socket_addr()?);

    axum::serve(listener, app)
        .await
        .map_err(backend::error::AppError::ServerIo)?;

    Ok(())
}
