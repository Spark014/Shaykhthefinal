# Al-Sa'd Scholarly Portal

Welcome to the Al-Sa'd Scholarly Portal, a Next.js application designed to host and present the works, lessons, and insights of Shaykh ʿAbdullāh ibn ʿAbd al-Raḥmān al-Saʿd.

## Features

*   **Homepage**: Welcome message and featured content.
*   **Biography Page**: Detailed biography of Shaykh ʿAbdullāh al-Saʿd.
*   **Resource Libraries**:
    *   Books & Collections: PDFs and articles, organizable into collections.
    *   Audio Library: Audio lessons and recordings, also organizable.
*   **Ask a Question**: Users can submit questions (in Arabic) to the Shaykh.
*   **Admin Dashboard**: For managing site content, settings, and user questions.
    *   Resource Management (PDFs, Audio, Videos, etc.)
    *   Collection Management
    *   Question Management (Review & Answer)
    *   Site Settings (Site titles, featured content)
    *   User Management (Illustrative - actual changes via Firebase Console)
*   **Bilingual Support**: English and Arabic interface, with content primarily in Arabic.
*   **Dark/Light Mode**: Theme toggling for user preference.
*   **Firebase Authentication**: For admin access.
*   **Supabase**: For database storage of resources, collections, and questions.
*   **Responsive Design**: Adapts to various screen sizes.

## Tech Stack

*   **Framework**: Next.js (App Router)
*   **Styling**: Tailwind CSS, ShadCN UI
*   **Authentication**: Firebase Authentication
*   **Database**: Supabase (PostgreSQL)
*   **Deployment**: Vercel (recommended) or any Node.js compatible host.
*   **AI (Optional)**: Genkit (if AI features are implemented, e.g., text simplification)
*   **Error Tracking (Optional)**: Sentry

## Getting Started

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm or yarn
*   A Firebase project
*   A Supabase project
*   An SMTP service for sending emails (e.g., SendGrid, Mailgun, Resend)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up Environment Variables:**
    *   Create a `.env.local` file in the root of your project by copying `.env.example`.
    *   Fill in the required values in `.env.local`. Refer to the comments in `.env.example` for descriptions of each variable.
        *   **Firebase Client SDK**: Obtain these from your Firebase project settings (Project Overview > Project settings > General > Your apps > Web app).
        *   **Supabase Client**: Obtain these from your Supabase project settings (Project Settings > API).
        *   **Supabase Service Role Key**: Obtain from Supabase project settings (Project Settings > API > Project API keys > `service_role` key). **Keep this secret!**
        *   **Firebase Admin SDK Config**: Generate a new private key for a service account in your Firebase project settings (Project settings > Service accounts > Generate new private key). Copy the entire JSON content and paste it as a single-line string for `FIREBASE_ADMIN_SDK_CONFIG`. **Keep this secret!**
        *   **SMTP Variables**: Configure these with your email provider's details.

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```
The application will be available at `http://localhost:9002` (or the port specified in your `dev` script).

## Available Scripts

*   `dev`: Starts the Next.js development server (usually on port 9002).
*   `build`: Builds the application for production.
*   `start`: Starts a Next.js production server (after running `build`).
*   `lint`: Lints the codebase using ESLint and Prettier.
*   `typecheck`: Runs TypeScript type checking.
*   `genkit:dev` / `genkit:watch`: (If Genkit is used) Starts Genkit development server.

## Deployment

This application is optimized for deployment on [Vercel](https://vercel.com/).

### Deploying to Vercel

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).
2.  **Import your project on Vercel:**
    *   Sign up or log in to Vercel.
    *   Click "Add New..." > "Project".
    *   Import your Git repository.
3.  **Configure Project Settings:**
    *   Vercel usually auto-detects Next.js projects.
    *   **Environment Variables**:
        *   Navigate to your project settings on Vercel.
        *   Go to "Settings" > "Environment Variables".
        *   Add all the environment variables defined in your `.env.local` (and listed in `.env.example`).
        *   **Important**: Variables like `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_ADMIN_SDK_CONFIG`, and `SMTP_PASS` are secrets and should be treated as such. Vercel encrypts these.
        *   Ensure `NEXT_PUBLIC_` prefixed variables are available to the browser, and others are server-side only.
4.  **Deploy**: Click the "Deploy" button.

Vercel can also be configured for automatic deployments whenever you push changes to your main branch.

### General Hosting

If deploying to another Node.js compatible host:
1.  Ensure your hosting provider supports Node.js.
2.  Set up environment variables securely according to your host's documentation.
3.  Use the `npm run build` command to build the application.
4.  Use the `npm run start` command to run the production server (or configure your host to use the `.next` output directory).

## Row Level Security (RLS) in Supabase

It's crucial to set up Row Level Security for your Supabase tables to protect your data.
*   **Public Tables (e.g., `resources`, `collections`)**: Typically allow public `SELECT` access.
    ```sql
    -- For collections table
    ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access to collections"
    ON collections FOR SELECT TO public USING (true);

    -- For resources table (similar policy)
    ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access to resources"
    ON resources FOR SELECT TO public USING (true);
    ```
*   **Admin-Writable Tables (e.g., `questions`, and also `resources`, `collections` for writes)**:
    *   Client-side `INSERT`, `UPDATE`, `DELETE` should be disallowed for `anon` and `authenticated` roles.
    *   All write operations must go through your Next.js API routes (e.g., `/api/admin/...`) which use the `SUPABASE_SERVICE_ROLE_KEY` (bypassing RLS) after authenticating the user with Firebase Admin SDK.
*   **`questions` Table**:
    *   Allow `INSERT` for `anon` or `authenticated` users (for submitting questions).
        ```sql
        ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow public insert for questions"
        ON questions FOR INSERT TO public WITH CHECK (true); 
        -- Add more specific checks if needed, e.g., char_length(question_text) > 10
        ```
    *   Restrict `SELECT`, `UPDATE`, `DELETE` to be handled by admin API routes.

## Contributing

(Optional: Add guidelines if you plan to have multiple contributors)

## License

(Optional: Specify a license, e.g., MIT)
