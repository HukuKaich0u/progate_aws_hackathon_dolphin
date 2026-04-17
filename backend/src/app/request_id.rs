use axum::{Router, http::HeaderName};
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};

pub fn apply_request_id<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let header_name = HeaderName::from_static("x-request-id");

    router
        .layer(PropagateRequestIdLayer::new(header_name.clone()))
        .layer(SetRequestIdLayer::new(header_name, MakeRequestUuid))
}
