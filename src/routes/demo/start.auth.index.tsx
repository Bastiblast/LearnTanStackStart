import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

const KEYCLOAK_URL = 'https://key.basthub.cloud/realms/famillion'
const KEYCLOAK_TOKEN_ENDPOINT = `${KEYCLOAK_URL}/protocol/openid-connect/token`
const KEYCLOAK_GOOGLE_ENDPOINT = 'https://key.basthub.cloud/realms/master/broker/google/endpoint'
const KEYCLOAK_GITHUB_ENDPOINT = 'https://key.basthub.cloud/realms/master/broker/github/endpoint'

// Server function to handle Keycloak authentication (avoids CORS)
const authenticateWithKeycloak = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string; password: string; clientId: string }) => data)
  .handler(async ({ data }) => {
    const response = await fetch(KEYCLOAK_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: data.clientId,
        username: data.username,
        password: data.password,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error_description || 
        errorData.error || 
        `Authentication failed (${response.status})`
      )
    }

    return response.json()
  })

// Server function to handle logout
const logoutFromKeycloak = createServerFn({ method: 'POST' })
  .inputValidator((data: { clientId: string; refreshToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      await fetch(`${KEYCLOAK_URL}/protocol/openid-connect/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: data.clientId,
          refresh_token: data.refreshToken,
        }),
      })
      return { success: true }
    } catch {
      return { success: false }
    }
  })

export const Route = createFileRoute('/demo/start/auth/')({
  component: AuthComponent,
})

interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  user: {
    email?: string
    name?: string
    preferred_username?: string
  } | null
  error: string | null
}

function AuthComponent() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
    error: null,
  })
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
      clientId: 'account', // Default Keycloak client
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setAuthState(prev => ({ ...prev, error: null }))

      try {
        // Use server function to avoid CORS issues
        const tokenData = await authenticateWithKeycloak({ data: value })
        
        // Decode JWT to get user info
        const userInfo = decodeJwt(tokenData.access_token)

        setAuthState({
          isAuthenticated: true,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          user: {
            email: userInfo.email as string | undefined,
            name: userInfo.name as string | undefined,
            preferred_username: userInfo.preferred_username as string | undefined,
          },
          error: null,
        })
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        }))
      } finally {
        setIsLoading(false)
      }
    },
  })

  const handleLogout = async () => {
    if (authState.refreshToken) {
      // Use server function to avoid CORS issues
      await logoutFromKeycloak({
        data: {
          clientId: form.state.values.clientId,
          refreshToken: authState.refreshToken,
        }
      })
    }
    
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      user: null,
      error: null,
    })
  }

  if (authState.isAuthenticated && authState.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex-1 items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-gray-600 mt-2">You are authenticated</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            {authState.user.preferred_username && (
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="font-medium text-gray-900">{authState.user.preferred_username}</span>
              </div>
            )}
            {authState.user.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium text-gray-900">{authState.user.email}</span>
              </div>
            )}
            {authState.user.name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium text-gray-900">{authState.user.name}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Keycloak Authentication</h1>
          <p className="text-gray-600 mt-2">Sign in with your credentials</p>
        </div>

        {authState.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{authState.error}</p>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-5"
        >
          <form.Field
            name="username"
            validators={{
              onBlur: ({ value }) => 
                !value ? 'Username is required' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onBlur: ({ value }) => 
                !value ? 'Password is required' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="clientId">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  id={field.name}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Keycloak Client ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            )}
          </form.Subscribe>
        </form>

        {/* Social Login Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3">
          <a
            href={KEYCLOAK_GOOGLE_ENDPOINT}
            className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </a>

          <a
            href={KEYCLOAK_GITHUB_ENDPOINT}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            Sign in with GitHub
          </a>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Connecting to: {KEYCLOAK_URL}
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper function to decode JWT without verification (for display purposes only)
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return {}
  }
}
