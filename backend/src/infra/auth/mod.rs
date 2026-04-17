use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use async_trait::async_trait;
use jsonwebtoken::{
    Algorithm, DecodingKey, Validation, decode, decode_header,
    jwk::{Jwk, JwkSet},
};
use reqwest::Client;
use serde::Deserialize;

use crate::{
    config::AppConfig,
    error::AppError,
    features::auth::{context::AuthenticatedUser, verifier::TokenVerifier},
};

#[derive(Clone)]
pub struct CognitoTokenVerifier {
    http_client: Client,
    issuer: String,
    jwks_url: String,
    client_id: String,
    keys_by_kid: Arc<RwLock<HashMap<String, DecodingKey>>>,
}

impl CognitoTokenVerifier {
    pub fn new(http_client: Client, config: &AppConfig) -> Self {
        Self {
            http_client,
            issuer: config.cognito_issuer(),
            jwks_url: config.cognito_jwks_url(),
            client_id: config.cognito_client_id.clone(),
            keys_by_kid: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    async fn decoding_key(&self, kid: &str) -> Result<DecodingKey, AppError> {
        if let Some(key) = self
            .keys_by_kid
            .read()
            .expect("jwks cache lock should not be poisoned")
            .get(kid)
            .cloned()
        {
            return Ok(key);
        }

        self.refresh_jwks().await?;

        self.keys_by_kid
            .read()
            .expect("jwks cache lock should not be poisoned")
            .get(kid)
            .cloned()
            .ok_or(AppError::Unauthorized)
    }

    async fn refresh_jwks(&self) -> Result<(), AppError> {
        let jwk_set = self
            .http_client
            .get(&self.jwks_url)
            .send()
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?
            .error_for_status()
            .map_err(|source| AppError::Dependency(source.to_string()))?
            .json::<JwkSet>()
            .await
            .map_err(|source| AppError::Dependency(source.to_string()))?;

        let keys_by_kid = jwk_set
            .keys
            .iter()
            .filter_map(Self::decode_jwk)
            .collect::<HashMap<_, _>>();

        *self
            .keys_by_kid
            .write()
            .expect("jwks cache lock should not be poisoned") = keys_by_kid;

        Ok(())
    }

    fn decode_jwk(jwk: &Jwk) -> Option<(String, DecodingKey)> {
        let kid = jwk.common.key_id.clone()?;
        let key = DecodingKey::from_jwk(jwk).ok()?;

        Some((kid, key))
    }
}

#[async_trait]
impl TokenVerifier for CognitoTokenVerifier {
    async fn verify(&self, bearer: &str) -> Result<AuthenticatedUser, AppError> {
        let header = decode_header(bearer).map_err(|_| AppError::Unauthorized)?;
        let kid = header.kid.ok_or(AppError::Unauthorized)?;
        let decoding_key = self.decoding_key(&kid).await?;

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[self.issuer.as_str()]);
        validation.validate_aud = false;

        let token = decode::<CognitoJwtClaims>(bearer, &decoding_key, &validation)
            .map_err(|_| AppError::Unauthorized)?;

        validate_claims(&token.claims, &self.issuer, &self.client_id)?;

        Ok(AuthenticatedUser {
            user_id: token.claims.sub,
        })
    }
}

#[derive(Debug, Deserialize)]
struct CognitoJwtClaims {
    sub: String,
    iss: String,
    token_use: String,
    aud: Option<String>,
    client_id: Option<String>,
    exp: u64,
}

fn validate_claims(
    claims: &CognitoJwtClaims,
    expected_issuer: &str,
    expected_client_id: &str,
) -> Result<(), AppError> {
    if claims.iss != expected_issuer || claims.exp == 0 {
        return Err(AppError::Unauthorized);
    }

    match claims.token_use.as_str() {
        "access" if claims.client_id.as_deref() == Some(expected_client_id) => Ok(()),
        "id" if claims.aud.as_deref() == Some(expected_client_id) => Ok(()),
        _ => Err(AppError::Unauthorized),
    }
}

#[derive(Clone, Default)]
pub struct RejectAllTokenVerifier;

#[async_trait]
impl TokenVerifier for RejectAllTokenVerifier {
    async fn verify(&self, _bearer: &str) -> Result<AuthenticatedUser, AppError> {
        Err(AppError::Unauthorized)
    }
}

pub fn cognito_token_verifier(config: &AppConfig) -> Arc<dyn TokenVerifier> {
    Arc::new(CognitoTokenVerifier::new(Client::new(), config))
}

pub fn default_token_verifier() -> Arc<dyn TokenVerifier> {
    Arc::new(RejectAllTokenVerifier)
}

#[cfg(test)]
mod tests {
    use super::{CognitoJwtClaims, validate_claims};

    fn access_claims() -> CognitoJwtClaims {
        CognitoJwtClaims {
            sub: "user-123".to_owned(),
            iss: "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_pool".to_owned(),
            token_use: "access".to_owned(),
            aud: None,
            client_id: Some("client-id".to_owned()),
            exp: 1,
        }
    }

    #[test]
    fn validate_claims_accepts_access_tokens_for_expected_client() {
        let claims = access_claims();

        assert!(
            validate_claims(&claims, &claims.iss, "client-id").is_ok(),
            "expected access token to validate"
        );
    }

    #[test]
    fn validate_claims_accepts_id_tokens_for_expected_client() {
        let mut claims = access_claims();
        claims.token_use = "id".to_owned();
        claims.client_id = None;
        claims.aud = Some("client-id".to_owned());

        assert!(
            validate_claims(&claims, &claims.iss, "client-id").is_ok(),
            "expected id token to validate"
        );
    }

    #[test]
    fn validate_claims_rejects_wrong_client_id() {
        let claims = access_claims();

        assert!(validate_claims(&claims, &claims.iss, "other-client").is_err());
    }
}
