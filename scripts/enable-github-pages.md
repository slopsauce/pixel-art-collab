# 🚀 Enable GitHub Pages - Step by Step

## Quick Setup (2 minutes)

### 1. Open Your Repository Settings
Click this link: **[https://github.com/slopsauce/pixel-art-collab/settings/pages](https://github.com/slopsauce/pixel-art-collab/settings/pages)**

### 2. Configure Source
- Under **"Source"**, you'll see a dropdown
- Select **"GitHub Actions"** (NOT "Deploy from a branch")
- Click **"Save"**

### 3. Verify Deployment
- Go to **[Actions tab](https://github.com/slopsauce/pixel-art-collab/actions)**
- You should see "Deploy to GitHub Pages" workflow running
- Wait 2-3 minutes for it to complete

### 4. Access Your Live App
Once deployment completes, your app will be live at:
**https://slopsauce.github.io/pixel-art-collab/**

## Troubleshooting

### If you don't see "GitHub Actions" option:
1. Make sure you're in the repository settings (not your personal settings)
2. Ensure you have admin permissions on the repository
3. The `.github/workflows/deploy.yml` file must exist (it does!)

### If deployment fails:
1. Check the Actions tab for error details
2. Ensure you have Pages enabled in repository settings
3. Verify the workflow file is in the correct location

## What Happens Next

✅ **Automatic deployments**: Every push to `main` will update your live app
✅ **HTTPS by default**: GitHub Pages provides SSL certificates
✅ **Global CDN**: Fast loading worldwide
✅ **Custom domain support**: Can add your own domain later

Your collaborative pixel art app will be accessible to anyone with the URL!