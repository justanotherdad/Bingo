# Git and GitHub setup

You do **not** need GitHub for Supabase, hosting, or running the app locally. GitHub (or GitLab, Bitbucket, etc.) is optional but **recommended** for backups, history, collaboration, and CI/CD.

This guide assumes macOS and a new project folder (for example `~/bingo`).

## 1. Install Git

Check if Git is already installed:

```bash
git --version
```

If it is missing, install Xcode Command Line Tools (includes Git):

```bash
xcode-select --install
```

Or install Git via [Homebrew](https://brew.sh/):

```bash
brew install git
```

## 2. Configure your identity (once per machine)

Use the name and email you want on commits (can match your GitHub account):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Optional: default branch name `main`:

```bash
git config --global init.defaultBranch main
```

## 3. Initialize the repository in your project

From your project root (where your code and `supabase/` folder live):

```bash
cd ~/bingo
git init
```

Create a `.gitignore` before the first commit so secrets and junk are not committed. At minimum ignore environment files and dependencies, for example:

```
.env
.env.*
!.env.example
node_modules/
.next/
dist/
.DS_Store
```

## 4. Create a GitHub repository

1. Sign in at [https://github.com](https://github.com).
2. Click **New repository** (or go to [https://github.com/new](https://github.com/new)).
3. Choose a name (for example `bingo`), leave **Public** or **Private**, and **do not** add a README, `.gitignore`, or license if you already have a local project (avoids merge conflicts).
4. Create the repository.

## 5. Connect your local folder to GitHub and push

GitHub shows you commands; they look like this (replace `YOUR_USER` and `YOUR_REPO`):

```bash
git remote add origin https://github.com/justanotherdad/Bingo.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

Use your GitHub username and a [Personal Access Token](https://github.com/settings/tokens) as the password when HTTPS prompts for credentials, or switch to SSH (below).

## 6. SSH instead of HTTPS (optional, convenient)

1. Create an SSH key (press Enter to accept defaults):

   ```bash
   ssh-keygen -t ed25519 -C "you@example.com"
   ```

2. Start the agent and add the key:

   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. Copy the **public** key and add it in GitHub under **Settings → SSH and GPG keys → New SSH key**:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

4. Use the SSH remote URL:

   ```bash
   git remote set-url origin git@github.com:YOUR_USER/YOUR_REPO.git
   ```

## 7. Never commit secrets

- Do **not** commit Supabase **service role** keys, database passwords, or `.env` files with real values.
- Commit a **`.env.example`** with empty or placeholder variable names only.
- Store real secrets in hosting provider env vars (e.g. Vercel) or local `.env` (gitignored).

## 8. GitHub CLI (optional)

The [GitHub CLI](https://cli.github.com/) (`gh`) can create repos and push from the terminal:

```bash
brew install gh
gh auth login
cd ~/bingo
gh repo create bingo --private --source=. --remote=origin --push
```

Adjust flags (`--public`, name) to match what you want.

---

After this, your workflow is usually: `git add` → `git commit` → `git push`. Pull changes on another machine with `git pull`.
