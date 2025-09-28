export const env = {
  keycloak: {
    url: 'http://localhost:8081/',            // your KC base URL
    realm: 'BankingApp',                        // realm name
    clientId: 'Banking-App',                  // the SPA client you created
  },
  apiBase: 'http://localhost:8080',           // your Spring base
  mapboxAccessToken: 'pk.eyJ1Ijoiam9uYXNpcWJhbCIsImEiOiJjbWJwNWl0czcwMHg0MmtzNWl6b3A3MzhtIn0.xV1K_XwZDvtdc80u05eqAw' 
};