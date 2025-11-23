# GitHub Pages Deployment Checklist

## ✅ Pre-Deployment Configuration

### Azure App Registration (One-Time Setup)
- [ ] Navigate to Azure Portal → App Registration (Client ID: 4cb6959c-34a4-4715-9b75-6f39042c0b44)
- [ ] **Authentication** → Supported account types: Set to "Multi-tenant" or appropriate type
- [ ] **Authentication** → Platform: Single-page application configured
- [ ] **Authentication** → Redirect URIs include:
  - [ ] `http://localhost:3000`
  - [ ] `http://localhost:3000/`
  - [ ] `https://jurglefoogle.github.io/CrickTime`
  - [ ] `https://jurglefoogle.github.io/CrickTime/`
- [ ] **Authentication** → Implicit grant: Both "Access tokens" and "ID tokens" enabled
- [ ] **API Permissions** → Azure Storage → user_impersonation (Delegated) granted
- [ ] **API Permissions** → Admin consent granted

### User Permissions (Per User)
- [ ] Each user has "Storage Blob Data Contributor" role on storage account `cricktime`
- [ ] Role assignment visible in Storage Account → Access Control (IAM)

### Repository Configuration
- [ ] `.env.production` file exists with Azure configuration (already committed)
- [ ] `.github/workflows/deploy.yml` exists and is configured (already set up)
- [ ] `package.json` has `homepage: "https://jurglefoogle.github.io/CrickTime"`
- [ ] GitHub Pages is enabled in repository settings

## 🚀 Deployment Process

### Automatic Deployment (Recommended)
1. Make your changes on a feature branch
2. Test locally: `npm start`
3. Commit changes: `git commit -m "your message"`
4. Push to main: `git push origin main`
5. GitHub Actions automatically builds and deploys
6. Check progress: GitHub → Actions tab
7. Verify deployment: `https://jurglefoogle.github.io/CrickTime/`

### Manual Deployment (If Needed)
```bash
# Build and deploy manually
npm run deploy

# Or step by step
npm run build:gh
gh-pages -d build
```

## ✅ Post-Deployment Verification

### Test Checklist
- [ ] Visit `https://jurglefoogle.github.io/CrickTime/`
- [ ] App loads correctly (no 404 errors)
- [ ] All icons and images load
- [ ] Navigation works (all tabs accessible)
- [ ] Click hamburger menu → Profile
- [ ] Scroll to "Cloud Backup" section
- [ ] Click "Backup to Cloud Now"
- [ ] Azure login popup appears
- [ ] Sign in with organizational account
- [ ] Consent screen appears (first time only)
- [ ] Backup uploads successfully
- [ ] Backup appears in list
- [ ] Can restore from backup
- [ ] Can delete backup

### Troubleshooting

**App shows 404 or blank page:**
- Check GitHub Pages settings: Settings → Pages → Source should be "gh-pages" branch
- Wait 2-3 minutes after deployment for DNS propagation
- Clear browser cache (Ctrl+F5)

**Azure login fails:**
- Verify all redirect URIs are added (with and without trailing slash)
- Check app registration supported account types
- Verify implicit grant tokens are enabled
- Wait 5-10 minutes after changing Azure settings

**Backup fails with "Access Denied":**
- User needs "Storage Blob Data Contributor" role
- Check role assignment in Storage Account → IAM
- Wait a few minutes for role propagation

**GitHub Actions fails:**
- Check Actions tab for error details
- Verify `GITHUB_TOKEN` has write permissions
- Check `package.json` scripts are correct

## 📋 Regular Maintenance

### Monthly
- [ ] Review Azure AD sign-in logs for unusual activity
- [ ] Check storage account costs/usage
- [ ] Test backup/restore functionality

### Quarterly  
- [ ] Review user access (remove departed users)
- [ ] Update npm dependencies: `npm update`
- [ ] Test on different browsers/devices

### Annually
- [ ] Review Azure app registration security
- [ ] Rotate storage account keys (if using)
- [ ] Audit backup retention policies

## 🆘 Emergency Procedures

### If deployment breaks production:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

### If users lose access:
1. Check Azure service health dashboard
2. Verify storage account is accessible
3. Check user role assignments
4. Test with your own account first

### If data is corrupted:
1. Users can restore from their cloud backups
2. Check backup history in Profile tab
3. Or download backup JSON manually from Azure Portal
