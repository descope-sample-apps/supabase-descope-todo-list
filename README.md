<img width="1400" alt="Screenshot 2024-01-18 at 9 50 28 AM" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/3c26be19-2d80-471c-bad3-03ad582d6a38">


---

This sample app is an open-source project, built with Next.js, the Descope Next.js SDK, and Supabase. This is a simple "todo list" application, that shows you how to use Supbase and RLS (Row-level Security) with Descope, natively in your application.

> **Note:** Supabase also supports using external [SAML providers](https://supabase.com/docs/guides/auth/sso/auth-sso-saml), however this is only available to Supabase Pro tiers and up. If you're using the Free tier with Supabase, the approach used in this sample app is the recommended approach for you.

## Table of Contents 📝

1. [How it Works](#how-it-works)
2. [Getting Started](#getting-started)
3. [Running the Application](#running-the-application)
4. [Issue Reporting](#issue-reporting)
5. [LICENSE](#license)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdescope-sample-apps%2Fsupabase-descope-todo-list&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_JWT_SECRET,NEXT_PUBLIC_DESCOPE_PROJECT_ID&envDescription=You'll%20need%20the%20following%20environment%20variables%20in%20order%20to%20run%20this%20application.&envLink=https%3A%2F%2Fgithub.com%2Fdescope-sample-apps%2Fsupabase-descope-todo-list%2Ftree%2Fmain%3Ftab%3Dreadme-ov-file%233-set-environment-variables)

## How it Works ✨

### High Level Overview

At a high level, this is what the sample app does:

- **1.** Uses the Descope Next.js SDK in the frontend to log the user in and create a Descope session JWT.
- **2.** Creates a Supabase-approved JWT with `jose` and the Supabase JWT Secret, with the Descope unique User ID as a claim in the JWT
- **3.** Supabase will retrieve this, decode the JWT, extract the `user_id` claim, and use it to identify the user.

The session will therefore be managed with Descope and the Next.js SDK in the frontend, and the app will only create a Supabase JWT, if there is a valid active session between the app and Descope.

### Postgres Row level security

This project uses very high-level Authorization using Postgres' Role Level Security.
When you start a Postgres database on Supabase, it is populated with an `auth` schema, and some helper functions.

After following all of the steps above, you'll be able to use Descope-based user details to provide fine-grained control over what each user can and cannot do.

## Getting Started 💿

### 1. Run "Todo List" Quickstart

Create a new project in Supabase. Once your database has started, run the **Todo List** quickstart. Inside of your project, enter the `SQL editor` tab and scroll down until you see `TODO LIST: Build a basic todo list with Row Level Security`.

### 2. Get the URL, Anon Key, and JWT Secret

Go to the Project Settings, open the API tab, and find your API URL, `anon` key, and your JWT Secret as you'll need these in the next step.

The `anon` key is your client-side API key. It allows "anonymous access" to your database, until the user has logged in. Once they have logged in, the keys will switch to the user's own login token. This enables row level security for your data. Read more about this [below](#postgres-row-level-security).

The `JWT Secret` is the secret that this sample app will sign the JWTs that you send to Supabase with. This is required since Supabase doesn't natively support using Descope JWTs, with their own secret.

![image](https://user-images.githubusercontent.com/10214025/88916245-528c2680-d298-11ea-8a71-708f93e1ce4f.png)

**_NOTE_**: The `service_role` key has full access to your data, bypassing any security policies. These keys have to be kept secret and are meant to be used in server environments and never on a client or browser.

### 3. Set Environment Variables

You can use the `.env.local.example` file in the root directory of this repo for your environment variables. Change this to `.env.local`, and then also fetch your Descope Project ID from [Project Settings](https://app.descope.com/settings/project).

Then paste the values from Step 2 and your Descope Project ID in for all of the environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=<YOUR API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Your Supabase ANON KEY>
SUPABASE_JWT_SECRET=<Your Supabase JWT Secret>

NEXT_PUBLIC_DESCOPE_PROJECT_ID=<Your Descope Project ID>
```

Once you've done this, your app should be ready to run.

However, in order to make sure that the users of this note app do not have access to any notes that are not assigned to their specific `user_id`, which is where the next step comes in.

### 4. Configure the RLS Policies for the Sample App

In order to control access to specific row-entries in your database, by `user_id` you'll need to add make some changes to the database configuration:

- **1.** First, you'll need to make sure that the `user_id` column is of type `text` rather than `UUID`. You can check this here:
 
<img width="600" alt="Monosnap Descope | Descope | Supabase 2024-01-18 11-15-11" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/95d50327-2e3b-4f7a-a061-6cd898272049">

If you need to change the type, you'll first have to delete the column and then add it again, with the type `text`:

<img width="600" alt="Monosnap Descope | Descope | Supabase 2024-01-18 11-20-27" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/454e21dc-bb61-408f-86cc-875330711b94">

> **Note:** If your`user_id` column is UUID, then Supabase will not allow Descope-based User IDs to be set in the column (this is ok, since all Descope User IDs are unique anyway).

- **2.** Next, you'll need to run a SQL query, to be able to map `auth.user_id()` to the claims that come from the JWT that will be sent to Supabase, via the SDK, in this sample app:

```
create or replace function auth.user_id() returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ language sql stable;
```

You'll need to put this under the `SQL Editor` and run this:

<img width="600" alt="Monosnap SQL | Supabase 2024-01-18 11-26-44" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/68472f73-714d-4897-9403-40c7ba88f65e">

- **3.** Next, you'll need to add the RLS policy for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. You can do this under Authentication -> Policies:

You will add the same policy, albeit with different `Names` and `Allowed Operations`, like this:

<img width="600" alt="Monosnap Auth | Supabase 2024-01-18 11-22-01" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/8def1f10-155a-4109-b44e-53e5acabaf79">

The value for `USING expression` should be:

```
(user_id = auth.user_id())
```

Once you've set all of the policies, your RLS Policies page should look like this:

<img width="600" alt="Screenshot 2024-01-18 at 11 24 31 AM" src="https://github.com/descope-sample-apps/supabase-descope-todo-list/assets/32936811/8eb03dba-0b1c-452b-996b-7add0f61809f">

## Running the Application 🚀

Once you've completed all of the steps above, to start the application, run:

```bash
yarn dev
```

## Issue Reporting ⚠️

For any issues or suggestions, feel free to open an issue in the GitHub repository.

## License 📜

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
