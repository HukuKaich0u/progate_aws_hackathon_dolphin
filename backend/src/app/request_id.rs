use std::time::Duration;

use axum::{
    Router,
    body::Body,
    http::{HeaderName, Request, Response},
};
use tower_http::{
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    trace::TraceLayer,
};
use tracing::{Span, info, info_span};

pub fn apply_request_id<S>(router: Router<S>) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    let header_name = HeaderName::from_static("x-request-id");
    let trace_header_name = header_name.clone();

    router
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(move |request: &Request<Body>| {
                    let request_id = request
                        .headers()
                        .get(&trace_header_name)
                        .and_then(|value| value.to_str().ok())
                        .unwrap_or("missing");

                    info_span!(
                        "http_request",
                        request_id = %request_id,
                        method = %request.method(),
                        uri = %request.uri(),
                    )
                })
                .on_response(|response: &Response<_>, latency: Duration, _span: &Span| {
                    info!(
                        status = %response.status(),
                        latency_ms = latency.as_millis(),
                        "http response"
                    );
                }),
        )
        .layer(PropagateRequestIdLayer::new(header_name.clone()))
        .layer(SetRequestIdLayer::new(header_name, MakeRequestUuid))
}
