# 🚀 Quick Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB running locally or Atlas connection
- Google Cloud Console account
- Mapbox account

## 1. Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd NagrikSetu
npm install
```

## 2. Environment Setup

### Backend (.env)

Create `backend/config.env`:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nagrikSetu
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=NagrikSetu <noreply@yourdomain.com>
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

### Frontend (.env)

Create `NagrikSetu/.env`:

```env
VITE_MAPBOX_API_KEY=your_mapbox_access_token_here
VITE_API_URL=http://localhost:3001
VITE_CLIENT_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 3. Get API Keys

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add `http://localhost:5173` to authorized origins

### Mapbox

1. Go to [Mapbox](https://account.mapbox.com/access-tokens/)
2. Sign up → Create access token
3. Copy token to `VITE_MAPBOX_API_KEY`

### Google Gemini AI

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy to `GEMINI_API_KEY`

### Gmail App Password

1. Enable 2FA on Gmail
2. Generate app password
3. Use in `EMAIL_PASS`

## 4. Start Servers

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd NagrikSetu
npm run dev
```

## 5. Test the Application

1. Visit `http://localhost:5173`
2. Click "Sign In" → Choose "User" or "Admin"
3. Test reporting an issue
4. Check admin dashboard

## 🎯 What's Working

✅ **Authentication** - Google OAuth login  
✅ **Report Creation** - Upload photos with location  
✅ **Live Map** - Interactive Mapbox integration  
✅ **AI Analysis** - Automatic issue categorization  
✅ **Email Notifications** - Status updates and welcome emails  
✅ **Admin Dashboard** - Report management and analytics  
✅ **Real-time Updates** - Socket.io integration  
✅ **Responsive Design** - Works on all devices  
✅ **Dark Mode** - Theme switching

## 🚨 Common Issues

### Map not loading

- Check `VITE_MAPBOX_API_KEY` is set correctly
- Verify Mapbox token is valid

### Authentication fails

- Verify Google OAuth credentials
- Check CORS settings in backend

### Email not sending

- Verify Gmail app password
- Check SMTP settings

### Database connection

- Ensure MongoDB is running
- Check connection string

## 📞 Need Help?

1. Check the main README.md for detailed setup
2. Verify all environment variables are set
3. Check browser console for errors
4. Check backend logs for API errors

---

**The application should now be fully functional! 🎉**
