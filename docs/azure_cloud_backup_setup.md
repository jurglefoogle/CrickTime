# Azure Cloud Backup Setup Instructions

This app uses Azure Blob Storage with Entra (Azure AD) authentication for cloud backup functionality.

## Prerequisites

1. Azure subscription
2. Storage account: `cricktime`
3. App registration in Azure AD

## Azure AD App Registration Setup

The app is already registered with:
- **Client ID**: `4cb6959c-34a4-4715-9b75-6f39042c0b44`
- **Object ID**: `27ca3635-7c8c-4a0f-b803-53fb8a7c6dae`

### Required Configuration in Azure Portal

1. **Navigate to App Registration**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Find app with Client ID: `4cb6959c-34a4-4715-9b75-6f39042c0b44`

2. **Configure Authentication**
   - Click "Authentication" in left menu
   - Under "Platform configurations", add **Single-page application**
   - Add Redirect URIs:
     - `http://localhost:3000` (for local development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - Under "Implicit grant and hybrid flows": Check **ID tokens**
   - Save changes

3. **Configure API Permissions**
   - Click "API permissions" in left menu
   - Click "Add a permission"
   - Select **Azure Storage**
   - Select **Delegated permissions**
   - Check **user_impersonation**
   - Click "Add permissions"
   - (Optional) Add **Microsoft Graph** → **User.Read** for user profile info
   - Click "Grant admin consent" (if you're admin)

## Storage Account Setup

### 1. Verify Storage Account exists
- Storage Account Name: `cricktime`
- Resource ID: `748922a0-28e1-48db-9162-0e9094f6e793`

### 2. Assign User Permissions

Each user needs the **Storage Blob Data Contributor** role:

**Via Azure Portal:**
1. Navigate to Storage Account `cricktime`
2. Click "Access Control (IAM)" in left menu
3. Click "+ Add" → "Add role assignment"
4. Select role: **Storage Blob Data Contributor**
5. Click "Next"
6. Click "+ Select members"
7. Search for and select the user's email/name
8. Click "Select"
9. Click "Review + assign"

**Via Azure CLI:**
```bash
# Get user's Object ID
az ad user show --id user@domain.com --query id -o tsv

# Assign role
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <USER_OBJECT_ID> \
  --scope "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/Microsoft.Storage/storageAccounts/cricktime"
```

**Via PowerShell:**
```powershell
# Get user
$user = Get-AzADUser -UserPrincipalName "user@domain.com"

# Assign role
New-AzRoleAssignment `
  -ObjectId $user.Id `
  -RoleDefinitionName "Storage Blob Data Contributor" `
  -Scope "/subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP>/providers/Microsoft.Storage/storageAccounts/cricktime"
```

## Container Setup

The app will automatically create a `backups` container if it doesn't exist (requires proper permissions).

To manually create it:
1. Go to Storage Account `cricktime` in Azure Portal
2. Click "Containers" in left menu
3. Click "+ Container"
4. Name: `backups`
5. Public access level: **Private**
6. Click "Create"

## Environment Variables

Copy `.env.local` in the project root (already configured):

```env
REACT_APP_AZURE_STORAGE_ACCOUNT=cricktime
REACT_APP_AZURE_CONTAINER=backups
REACT_APP_AZURE_TENANT_ID=common
REACT_APP_AZURE_CLIENT_ID=4cb6959c-34a4-4715-9b75-6f39042c0b44
```

## User Experience

When a user tries to backup for the first time:
1. They click "Backup to Cloud Now" in Profile tab
2. A popup window opens for Azure login
3. They sign in with their Azure AD credentials
4. They consent to app permissions (first time only)
5. The backup uploads to their Azure Blob Storage

## Troubleshooting

### "Access Denied" Error
- Verify user has "Storage Blob Data Contributor" role assigned
- Check role assignment scope (should be on storage account or container)
- Wait a few minutes for role assignment to propagate

### "Authentication Failed" Error
- Verify App Registration redirect URIs include current URL
- Check API permissions are granted
- Try signing out and back in

### "Container Not Found" Error
- Verify storage account name is correct
- Check container name is `backups`
- Ensure user has permission to create containers

### "CORS Error"
- Go to Storage Account → Settings → Resource sharing (CORS)
- Add rule for Blob service:
  - Allowed origins: `http://localhost:3000` or your domain
  - Allowed methods: GET, PUT, POST, DELETE, HEAD, OPTIONS
  - Allowed headers: `*`
  - Exposed headers: `*`
  - Max age: `3600`

## Security Notes

- Each user authenticates with their own Azure AD account
- Backups are stored in their organization's storage account
- No shared credentials or API keys in the application
- Uses OAuth 2.0 with PKCE flow for browser security
- Tokens are never exposed to the application code
- All communication uses HTTPS
