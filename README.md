# Firebase Generic HTTP Proxy

A secure, configurable HTTP proxy using Firebase Cloud Functions with CORS support, domain whitelisting, and API key authentication.

## Features

- ✅ **CORS Support** - Enables cross-origin requests from web browsers
- ✅ **API Key Authentication** - Secure access control
- ✅ **Domain Whitelisting** - Restrict proxy to specific domains
- ✅ **Header Forwarding** - Pass authentication headers securely
- ✅ **Auto Response Parsing** - Handles JSON and text responses
- ✅ **Multiple HTTP Methods** - GET, POST, PUT, DELETE, etc.

## Installation & Deployment

### Step 1: Prerequisites
```bash
# Install Node.js (v16 or higher)
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login
```

### Step 2: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., `my-proxy-project`)
4. Enable Google Analytics (optional)
5. Create project

### Step 3: Setup Local Project
```bash
# Clone or download this code
cd firebase-proxy

# Initialize Firebase in this directory
firebase init functions
# Select: Use an existing project
# Choose your project from the list
# Select JavaScript
# Use ESLint: No
# Install dependencies: Yes

# Install additional dependencies
npm install cors node-fetch
```

### Step 4: Configuration (Required)
```bash
# Set your API key (REQUIRED - change this!)
firebase functions:config:set proxy.apikey="your-super-secret-api-key-123"

# Set allowed domains (REQUIRED - comma-separated, no spaces)
firebase functions:config:set proxy.domains="api.example.com,api.example2.com"

# Verify configuration
firebase functions:config:get
```

### Step 5: Deploy
```bash
# Deploy to Firebase
firebase deploy --only functions

# Note the deployed URL:
# ✔ functions[proxy(us-central1)]: https://us-central1-PROJECT-ID.cloudfunctions.net/proxy
```

### Step 6: Test Deployment
```bash
# Test with curl (replace PROJECT-ID and API-KEY)
curl -X POST "https://us-central1-PROJECT-ID.cloudfunctions.net/proxy" \
  -H "x-api-key: your-super-secret-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get"}'
```

## Usage

### Endpoint
```
https://YOUR-PROJECT.cloudfunctions.net/proxy
```

### Authentication
Include API key in request:
- **Header**: `x-api-key: your-secret-api-key`

### Method 1: POST Request (Recommended)
```javascript
fetch('https://project.cloudfunctions.net/proxy', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-secret-api-key',
    'x-target-authtoken': 'api-auth-token',    // Forwarded as 'authtoken'
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://api.example.com/endpoint',
    body: JSON.stringify({data: 'value'})
  })
})
```

### Method 2: GET Request (Simple)
```javascript
fetch('https://project.cloudfunctions.net/proxy?url=https://api.example.com', {
  headers: {
    'x-target-authtoken': 'api-auth-token',    // Forwarded as 'authtoken'
  }
})
```

### Response Format
```json
{
  "status": 200,
  "data": "parsed response (JSON object or text string)"
}
```

## Configuration Management

### Required Configuration
Before deployment, you MUST set these configurations:

```bash
# 1. API Key (for authentication)
firebase functions:config:set proxy.apikey="your-secret-key"

[OR]

# Strong API key (recommended)
firebase functions:config:set proxy.apikey="$(openssl rand -base64 32)"

# 2. Allowed Domains (security whitelist)
firebase functions:config:set proxy.domains="domain1.com,domain2.com"

```

### View Current Config
```bash
firebase functions:config:get
```

### Update Config
```bash
# Update API key
firebase functions:config:set proxy.apikey="new-stronger-key"

# Add more domains
firebase functions:config:set proxy.domains="api1.com,api2.com,api3.com"

# IMPORTANT: Redeploy after config changes
firebase deploy --only functions
```

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Invalid API key | Missing or incorrect API key |
| 400 | URL required | No target URL provided |
| 400 | Invalid URL format | Malformed URL |
| 403 | Domain not allowed | Target domain not in whitelist |
| 500 | Proxy request failed | Network or server error |

## Development & Testing

### Local Testing
```bash
# Set local config for testing
firebase functions:config:set proxy.apikey="test-key-123"
firebase functions:config:set proxy.domains="httpbin.org,jsonplaceholder.typicode.com"

# Start emulator
firebase emulators:start --only functions

# Test endpoint (in another terminal)
curl -X POST "http://localhost:5001/YOUR-PROJECT-ID/us-central1/proxy" \
  -H "x-api-key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get"}'
```

### Troubleshooting

**Error: "Invalid API key"**
```bash
# Check if API key is set
firebase functions:config:get proxy.apikey
# If empty, set it:
firebase functions:config:set proxy.apikey="your-key"
```

**Error: "Domain not allowed"**
```bash
# Check allowed domains
firebase functions:config:get proxy.domains
# Add your domain:
firebase functions:config:set proxy.domains="yourdomain.com,existing-domains"
```

### Project Structure
```
firebase-proxy/
├── index.js          # Main proxy function
├── package.json      # Dependencies
├── firebase.json     # Firebase config
└── README.md         # This file
```

## Use Cases

- **CORS Bypass** - Enable browser requests to APIs without CORS headers
- **API Gateway** - Centralized access control for multiple APIs
- **Header Injection** - Add authentication headers server-side
- **Domain Restriction** - Limit proxy usage to specific APIs
- **Request Logging** - Monitor API usage (via Firebase logs)

## CI/CD Deployment with GitHub Actions

### Step 1: Create Firebase Service Account
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Copy the entire JSON content

### Step 2: Setup GitHub Secrets
1. Go to your GitHub repository
2. **Settings** → **Secrets and Variables** → **Actions**
3. Click **New Repository Secret**
4. Add these secrets:

```
FIREBASE_SERVICE_ACCOUNT
# Paste the entire JSON content from step 2

FIREBASE_PROJECT_ID
# Your Firebase project ID (e.g., my-proxy-project)

PROXY_API_KEY
# Your proxy API key (e.g., super-secret-key-123)

PROXY_DOMAINS
# Comma-separated domains (e.g., api.example.com)
```

### Step 3: Create GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    container: node:18-alpine

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Install system dependencies
      run: apk add --no-cache git curl jq bash

    - name: Install dependencies
      run: npm install

    - name: Create Firebase service account file
      run: |
        echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}' > firebase-service-account.json

    - name: Install Firebase CLI
      run: npm install -g firebase-tools

    - name: Set Firebase configuration
      run: |
        firebase functions:config:set \
          proxy.apikey="${{ secrets.PROXY_API_KEY }}" \
          proxy.domains="${{ secrets.PROXY_DOMAINS }}" \
          --project ${{ secrets.FIREBASE_PROJECT_ID }}
      env:
        GOOGLE_APPLICATION_CREDENTIALS: firebase-service-account.json

    - name: Deploy to Firebase
      run: |
        firebase deploy --only functions --project ${{ secrets.FIREBASE_PROJECT_ID }}
      env:
        GOOGLE_APPLICATION_CREDENTIALS: firebase-service-account.json

    - name: Cleanup
      run: rm -f firebase-service-account.json
```

### Step 4: Auto-Deploy Setup
1. **Push to main branch** triggers automatic deployment
2. **Pull requests** run tests (optional)
3. **Configuration** is set automatically from GitHub secrets
4. **Deployment** happens without manual intervention

### Step 6: Verify Deployment
```bash
# Check GitHub Actions tab in your repository
# Verify deployment logs
# Test the deployed function URL

curl -X POST "https://us-central1-PROJECT-ID.cloudfunctions.net/proxy" \
  -H "x-api-key: YOUR-API-KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://httpbin.org/get"}'
```

### Environment Management
For multiple environments (dev/staging/prod):

```yaml
# Add to workflow for environment-specific deployment
- name: Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: firebase deploy --project ${{ secrets.FIREBASE_PROJECT_ID_STAGING }}

- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: firebase deploy --project ${{ secrets.FIREBASE_PROJECT_ID_PROD }}
```
