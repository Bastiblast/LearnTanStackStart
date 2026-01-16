import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  fetchDiscoveryMetadata,
  fetchDiscoveryFromUrl,
  KEYCLOAK_CONFIGS,
  extractEndpoints,
  validateMetadataCapabilities,
  type KeycloakDiscoveryMetadata,
  type KeycloakConfig,
} from '../../lib/keycloak-discovery'

export const Route = createFileRoute('/demo/start/auth/discovery')({
  component: DiscoveryComponent,
})

function DiscoveryComponent() {
  const [metadata, setMetadata] = useState<KeycloakDiscoveryMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRealm, setSelectedRealm] = useState<'master' | 'famillion'>('master')
  const [customUrl, setCustomUrl] = useState('')
  const [useCustomUrl, setUseCustomUrl] = useState(false)

  const fetchMetadata = async () => {
    setLoading(true)
    setError(null)
    setMetadata(null)

    try {
      let data: KeycloakDiscoveryMetadata

      if (useCustomUrl && customUrl) {
        data = await fetchDiscoveryFromUrl(customUrl)
      } else {
        const config: KeycloakConfig = KEYCLOAK_CONFIGS[selectedRealm]
        data = await fetchDiscoveryMetadata(config)
      }

      setMetadata(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metadata')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const endpoints = metadata ? extractEndpoints(metadata) : null

  const validation = metadata
    ? validateMetadataCapabilities(metadata, {
        grantTypes: ['authorization_code', 'refresh_token', 'password'],
        responseTypes: ['code', 'id_token'],
        scopes: ['openid', 'profile', 'email'],
      })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Keycloak Discovery Endpoint
          </h1>
          <p className="text-gray-600">
            Import metadata from a remote IDP discovery descriptor (OpenID Connect Discovery)
          </p>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>

          <div className="space-y-4">
            {/* Toggle Custom URL */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="useCustomUrl"
                checked={useCustomUrl}
                onChange={(e) => setUseCustomUrl(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="useCustomUrl" className="text-sm font-medium text-gray-700">
                Use custom discovery URL
              </label>
            </div>

            {useCustomUrl ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discovery URL
                </label>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/realms/myrealm/.well-known/openid-configuration"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Realm
                </label>
                <select
                  value={selectedRealm}
                  onChange={(e) => setSelectedRealm(e.target.value as 'master' | 'famillion')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="master">Master Realm</option>
                  <option value="famillion">Famillion Realm</option>
                </select>
                <p className="mt-2 text-sm text-gray-500">
                  Discovery URL: {KEYCLOAK_CONFIGS[selectedRealm].baseUrl}/realms/{selectedRealm}/.well-known/openid-configuration
                </p>
              </div>
            )}

            <button
              onClick={fetchMetadata}
              disabled={loading || (useCustomUrl && !customUrl)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Import Metadata
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validation && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Capability Validation</h2>
            <div className={`p-4 rounded-lg ${validation.valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              {validation.valid ? (
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All required capabilities are supported
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-yellow-700 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Some capabilities are missing
                  </div>
                  <ul className="list-disc list-inside text-yellow-600 text-sm">
                    {validation.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Endpoints */}
        {endpoints && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endpoints</h2>
            <div className="grid gap-3">
              {Object.entries(endpoints).map(([name, url]) => (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900 capitalize">{name.replace(/([A-Z])/g, ' $1')}</span>
                    <p className="text-sm text-gray-500 break-all">{url}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(url)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Metadata */}
        {metadata && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Full Metadata</h2>
              <button
                onClick={() => copyToClipboard(JSON.stringify(metadata, null, 2))}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy JSON
              </button>
            </div>

            {/* Issuer */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Issuer:</span>
              <p className="text-blue-900">{metadata.issuer}</p>
            </div>

            {/* Supported Features */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Grant Types Supported</h3>
                <div className="flex flex-wrap gap-1">
                  {metadata.grant_types_supported.map((grant) => (
                    <span key={grant} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                      {grant}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Response Types Supported</h3>
                <div className="flex flex-wrap gap-1">
                  {metadata.response_types_supported.map((type) => (
                    <span key={type} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Scopes Supported</h3>
                <div className="flex flex-wrap gap-1">
                  {metadata.scopes_supported.map((scope) => (
                    <span key={scope} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Claims Supported</h3>
                <div className="flex flex-wrap gap-1">
                  {metadata.claims_supported.map((claim) => (
                    <span key={claim} className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                      {claim}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Raw JSON */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                View Raw JSON
              </summary>
              <pre className="mt-2 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto text-xs max-h-96">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="/demo/start/auth"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Authentication Form</h3>
              <p className="text-sm text-gray-500">Sign in with username/password or social providers</p>
            </a>
            <a
              href={`${KEYCLOAK_CONFIGS[selectedRealm].baseUrl}/realms/${selectedRealm}/.well-known/openid-configuration`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Open Discovery URL</h3>
              <p className="text-sm text-gray-500">View raw JSON in new tab</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
