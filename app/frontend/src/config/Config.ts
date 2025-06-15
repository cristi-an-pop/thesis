export const Config = {
    firebase: {
        apiKey: import.meta.env.VITE_FB_API_KEY,
        authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FB_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FB_APP_ID,
        measurementId: import.meta.env.VITE_FB_MEASUREMENT_ID,
    },
    adminSDK: {
        type: import.meta.env.FB_TYPE,
        project_id: import.meta.env.VITE_FB_PROJECT_ID,
        private_key_id: import.meta.env.FB_PRIVATE_KEY_ID,
        private_key: import.meta.env.FB_PRIVATE_KEY,
        client_email: import.meta.env.FB_CLIENT_EMAIL,
        client_id: import.meta.env.FB_CLIENT_ID,
        auth_uri: import.meta.env.FB_AUTH_URI,
        token_uri: import.meta.env.FB_TOKEN_URI,
        auth_provider_x509_cert_url: import.meta.env.FB_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: import.meta.env.FB_CLIENT_X509_CERT_URL,
        universe_domain: import.meta.env.FB_UNIVERSE_DOMAIN,
    },
    accessTokenSecret: import.meta.env.VITE_ACCESS_TOKEN_SECRET
};