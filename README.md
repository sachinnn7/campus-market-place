# Campus Market Place

A lightweight, client-side web app where students can buy and sell notes, books, and more. Data persists in the browser using localStorage.

## Run

- Backend
  - Open terminal in `backend/`
  - Run `npm install`
  - Create `.env` (optional):

    ```
    PORT=4000
    JWT_SECRET=change-this-secret
    ```
  - Start: `npm run start` (or `npm run dev`)

- Frontend
  - Open `index.html` directly in your browser
  - Or serve the root folder with any static server

## Features

- Post items with title, category, condition, price, description, contact email, and optional photo.
- Browse listings with search, category/condition filters, and sorting.
- Wishlist items and contact sellers via mailto links.
- Responsive layout with a dark theme.

## Notes

- Images are stored as data URLs in localStorage; clear site data to reset.
- This is a front-end only demo; add a backend later for multi-user sync and auth.
  - Now includes a basic Node/Express backend with JWT auth and file storage (JSON). Use for local development only.


