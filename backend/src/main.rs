use backend::{
    app::{router::create_router, state::AppState},
    config::AppConfig,
    infra::{auth::cognito_token_verifier, chime::chime_meeting_provider, db::create_pool},
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
    let aws_sdk_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .load()
        .await;
    let chime_client = aws_sdk_chimesdkmeetings::Client::new(&aws_sdk_config);
    let state = AppState {
        token_verifier: cognito_token_verifier(&config),
        meeting_provider: chime_meeting_provider(chime_client, &config),
        config,
        db_pool,
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
