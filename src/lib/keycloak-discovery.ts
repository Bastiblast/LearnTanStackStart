/**
 * Keycloak OpenID Connect Discovery
 * Fetches metadata from the remote IDP discovery descriptor
 * 
 * Discovery Endpoint: /.well-known/openid-configuration
 */

export interface KeycloakDiscoveryMetadata {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  introspection_endpoint: string
  userinfo_endpoint: string
  end_session_endpoint: string
  frontchannel_logout_session_supported: boolean
  frontchannel_logout_supported: boolean
  jwks_uri: string
  check_session_iframe: string
  grant_types_supported: string[]
  acr_values_supported: string[]
  response_types_supported: string[]
  subject_types_supported: string[]
  id_token_signing_alg_values_supported: string[]
  id_token_encryption_alg_values_supported: string[]
  id_token_encryption_enc_values_supported: string[]
  userinfo_signing_alg_values_supported: string[]
  userinfo_encryption_alg_values_supported: string[]
  userinfo_encryption_enc_values_supported: string[]
  request_object_signing_alg_values_supported: string[]
  request_object_encryption_alg_values_supported: string[]
  request_object_encryption_enc_values_supported: string[]
  response_modes_supported: string[]
  registration_endpoint: string
  token_endpoint_auth_methods_supported: string[]
  token_endpoint_auth_signing_alg_values_supported: string[]
  introspection_endpoint_auth_methods_supported: string[]
  introspection_endpoint_auth_signing_alg_values_supported: string[]
  authorization_signing_alg_values_supported: string[]
  authorization_encryption_alg_values_supported: string[]
  authorization_encryption_enc_values_supported: string[]
  claims_supported: string[]
  claim_types_supported: string[]
  claims_parameter_supported: boolean
  scopes_supported: string[]
  request_parameter_supported: boolean
  request_uri_parameter_supported: boolean
  require_request_uri_registration: boolean
  code_challenge_methods_supported: string[]
  tls_client_certificate_bound_access_tokens: boolean
  revocation_endpoint: string
  revocation_endpoint_auth_methods_supported: string[]
  revocation_endpoint_auth_signing_alg_values_supported: string[]
  backchannel_logout_supported: boolean
  backchannel_logout_session_supported: boolean
  device_authorization_endpoint: string
  backchannel_token_delivery_modes_supported: string[]
  backchannel_authentication_endpoint: string
  backchannel_authentication_request_signing_alg_values_supported: string[]
  require_pushed_authorization_requests: boolean
  pushed_authorization_request_endpoint: string
  mtls_endpoint_aliases: {
    token_endpoint: string
    revocation_endpoint: string
    introspection_endpoint: string
    device_authorization_endpoint: string
    registration_endpoint: string
    userinfo_endpoint: string
    pushed_authorization_request_endpoint: string
    backchannel_authentication_endpoint: string
  }
}

export interface KeycloakConfig {
  baseUrl: string
  realm: string
}

export interface DiscoveryResult {
  metadata: KeycloakDiscoveryMetadata | null
  error: string | null
  loading: boolean
}

/**
 * Builds the discovery endpoint URL for a Keycloak realm
 */
export function buildDiscoveryUrl(config: KeycloakConfig): string {
  const { baseUrl, realm } = config
  return `${baseUrl}/realms/${realm}/.well-known/openid-configuration`
}

/**
 * Fetches the OpenID Connect discovery metadata from Keycloak
 */
export async function fetchDiscoveryMetadata(
  config: KeycloakConfig
): Promise<KeycloakDiscoveryMetadata> {
  const discoveryUrl = buildDiscoveryUrl(config)
  
  const response = await fetch(discoveryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch discovery metadata: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Fetches discovery metadata from a custom URL
 */
export async function fetchDiscoveryFromUrl(
  discoveryUrl: string
): Promise<KeycloakDiscoveryMetadata> {
  const response = await fetch(discoveryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch discovery metadata: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Pre-configured Keycloak instances
 */
export const KEYCLOAK_CONFIGS = {
  master: {
    baseUrl: 'https://key.basthub.cloud',
    realm: 'master',
  },
  famillion: {
    baseUrl: 'https://key.basthub.cloud',
    realm: 'famillion',
  },
} as const

/**
 * Identity Provider broker endpoints
 */
export const IDP_BROKER_ENDPOINTS = {
  google: 'https://key.basthub.cloud/realms/master/broker/google/endpoint',
  github: 'https://key.basthub.cloud/realms/master/broker/github/endpoint',
  keycloakOidc: 'https://key.basthub.cloud/realms/master/broker/keycloak-oidc/endpoint',
} as const

/**
 * Get all important endpoints from discovery metadata
 */
export function extractEndpoints(metadata: KeycloakDiscoveryMetadata) {
  return {
    authorization: metadata.authorization_endpoint,
    token: metadata.token_endpoint,
    userinfo: metadata.userinfo_endpoint,
    logout: metadata.end_session_endpoint,
    jwks: metadata.jwks_uri,
    introspection: metadata.introspection_endpoint,
    revocation: metadata.revocation_endpoint,
    registration: metadata.registration_endpoint,
    deviceAuthorization: metadata.device_authorization_endpoint,
    pushedAuthorization: metadata.pushed_authorization_request_endpoint,
  }
}

/**
 * Validate if the metadata supports required features
 */
export function validateMetadataCapabilities(
  metadata: KeycloakDiscoveryMetadata,
  requirements: {
    grantTypes?: string[]
    responseTypes?: string[]
    scopes?: string[]
  }
): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (requirements.grantTypes) {
    for (const grant of requirements.grantTypes) {
      if (!metadata.grant_types_supported.includes(grant)) {
        missing.push(`grant_type: ${grant}`)
      }
    }
  }

  if (requirements.responseTypes) {
    for (const responseType of requirements.responseTypes) {
      if (!metadata.response_types_supported.includes(responseType)) {
        missing.push(`response_type: ${responseType}`)
      }
    }
  }

  if (requirements.scopes) {
    for (const scope of requirements.scopes) {
      if (!metadata.scopes_supported.includes(scope)) {
        missing.push(`scope: ${scope}`)
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}
