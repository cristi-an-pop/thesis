export const Config = {
    firebase: {
        api_key: import.meta.env.FB_API_KEY,
        messaging_sender_id: import.meta.env.FB_MESSAGING_SENDER_ID,
        app_id: import.meta.env.FB_APP_ID,
        measurement_id: import.meta.env.FB_MEASUREMENT_ID,
        type: import.meta.env.FB_TYPE,
        project_id: import.meta.env.VITE_FB_PROJECT_ID,
        private_key_id: import.meta.env.VITE_FB_PRIVATE_KEY_ID,
        private_key: import.meta.env.FB_PRIVATE_KEY,
        client_email: import.meta.env.FB_CLIENT_EMAIL,
        client_id: import.meta.env.FB_CLIENT_ID,
        auth_uri: import.meta.env.FB_AUTH_URI,
        token_uri: import.meta.env.FB_TOKEN_URI,
        auth_provider_x509_cert_url: import.meta.env.FB_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: import.meta.env.FB_CLIENT_X509_CERT_URL,
        universe_domain: import.meta.env.FB_UNIVERSE_DOMAIN,
        storage_bucket: import.meta.env.VUE_APP_FIREBASE_STORAGE_BUCKET
    },
    accessTokenSecret: import.meta.env.ACCESS_TOKEN_SECRET
}