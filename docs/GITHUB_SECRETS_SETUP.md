# Setting Up Azure Secrets for GitHub Actions

## Problem
The Azure SAS token should never be committed to the repository for security reasons. Instead, it should be stored as a GitHub Secret and injected at build time.

## Solution

### Step 1: Add the Secret to GitHub

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name:** `AZURE_SAS_TOKEN`
   - **Value:** Your Azure SAS token (e.g., `?sv=2024-11-04&ss=bfqt&srt=co&sp=...`)

### Step 2: Local Development

For local development with production builds:

1. Copy the example file:
   ```bash
   cp .env.production.example .env.production
   ```

2. Edit `.env.production` and replace `YOUR_SAS_TOKEN_HERE` with your actual Azure SAS token

3. The `.env.production` file is gitignored and will not be committed

### Step 3: Verify the Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) is already configured to inject the secret:

```yaml
- name: Build (PUBLIC_URL=/CrickTime)
  env:
    REACT_APP_AZURE_SAS_TOKEN: ${{ secrets.AZURE_SAS_TOKEN }}
  run: PUBLIC_URL=/CrickTime npm run build
```

## Security Notes

- **NEVER** commit actual SAS tokens to the repository
- SAS tokens in `.env.production` are gitignored
- Only use GitHub Secrets for production deployments
- Regenerate tokens if they are accidentally exposed

## Additional Resources

- [GitHub Encrypted Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Azure SAS Token Documentation](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
