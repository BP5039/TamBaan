# TamBaan — Feature 1 prototype

Accounts, profile creation (with photo upload), role selection, work-category
selection, and a professional's portfolio section. Built with Vue 3 + Vite +
TypeScript + Tailwind + Pinia + Firebase (Auth, Firestore, Storage).

## 1. Install dependencies

```bash
npm install
```

## 2. Connect Firebase

A `.env` file is already included with your `project-tambaan` config, so you
can skip straight to step 3 if you're using the same Firebase project.

If you ever need to redo this from scratch:

1. Go to the [Firebase console](https://console.firebase.google.com/) → your
   project → **Project settings** → scroll to **Your apps** → copy the config
   object.
2. Paste the values into `.env` (copy `.env.example` if starting fresh):

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

3. In the Firebase console, enable:
   - **Authentication** → Sign-in method → enable **Email/Password**.
   - **Firestore Database** → create database (start in production mode).
   - **Storage** → get started (default bucket is fine).

4. Deploy the security rules included in this repo (or paste them into the
   console's Rules tab manually):

   ```bash
   npm install -g firebase-tools   # if you don't have it yet
   firebase login
   firebase init                  # select Firestore + Storage, point at project-tambaan
   firebase deploy --only firestore:rules,storage:rules
   ```

   `firestore.rules` and `storage.rules` are already written for this
   feature — profiles and portfolio items are publicly readable (needed for
   contractor discovery later) but only editable by their owner.

## 3. Run it

```bash
npm run dev
```

Opens at `http://localhost:5173`. First run: register → you'll be dropped
into profile setup automatically → fill it in → land on your profile page.

## 4. Build for production

```bash
npm run build
```

Outputs to `dist/`, ready to deploy to Vercel (drag the folder in, or connect
the GitHub repo for auto-deploy on push, per your tool choice in the
proposal).

## What's included (Feature 1 scope)

- Email/password register + login (`src/views/LoginView.vue`,
  `RegisterView.vue`)
- Route guards that send logged-in users without a profile to `/onboarding`
  automatically (`src/router/index.ts`)
- Profile creation/edit form: photo upload, name, phone, LINE/Facebook ID,
  province (all 77), role select, work-category multi-select for
  professionals (`src/views/ProfileFormView.vue`)
- Profile page matching the sketch: sidebar info + role-based badges, and a
  main panel that becomes "+ Add work" with an image+description upload flow
  for professionals (`src/views/ProfileView.vue`)

## What's intentionally stubbed

- "+ Create project" for homeowners is disabled with a note — project
  creation is Feature 3 in the proposal, not this one.
- No Google sign-in button yet — easy to add later via
  `signInWithPopup(auth, new GoogleAuthProvider())`, same pattern as
  `login()` in `src/stores/auth.ts`.
