# NagrikSetu Feature Test Checklist

## ✅ **Backend API System**

### **Authentication System**

- [ ] Google OAuth login works
- [ ] JWT tokens are generated and stored
- [ ] Token refresh mechanism works
- [ ] Logout clears all tokens
- [ ] Protected routes require authentication
- [ ] Admin routes require admin role

### **Report Management**

- [ ] Users can submit new reports
- [ ] Reports are saved to MongoDB
- [ ] Image upload works (if Cloudinary configured)
- [ ] Location coordinates are properly stored
- [ ] Report status updates work
- [ ] Admin can assign contractors
- [ ] Users can view their own reports
- [ ] Admin can view all reports

### **Map Features**

- [ ] Map data endpoint returns reports
- [ ] Statistics are calculated correctly
- [ ] Filtering by type/severity works
- [ ] Location-based queries work
- [ ] Heatmap data is generated
- [ ] Cluster data is generated

### **User Dashboard**

- [ ] User statistics are displayed
- [ ] User reports are listed
- [ ] Points and level system works
- [ ] Progress bars update correctly
- [ ] Loading states work

### **Admin Dashboard**

- [ ] Admin can view all reports
- [ ] Status updates work
- [ ] Contractor assignment works
- [ ] Statistics are accurate
- [ ] Filtering works

## 🔧 **Setup Instructions**

### **1. Backend Setup**

```bash
cd backend
npm install
cp config.env.example config.env
# Edit config.env with your settings
npm start
```

### **2. Frontend Setup**

```bash
cd NagrikSetu
npm install
npm run dev
```

### **3. Environment Configuration**

```env
# Required
MONGODB_URI=mongodb://localhost:27017/nagrikSetu
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAILS=admin@example.com

# Optional
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🧪 **Testing Steps**

### **1. Authentication Test**

1. Open http://localhost:5173
2. Click "Sign in with Google"
3. Verify user is redirected to dashboard
4. Check localStorage for tokens
5. Test logout functionality

### **2. Report Submission Test**

1. Navigate to Report page
2. Fill out all required fields
3. Upload an image (optional)
4. Submit the report
5. Verify success message
6. Check database for new report

### **3. Map View Test**

1. Navigate to Map page
2. Verify reports are displayed
3. Test filters (type, severity)
4. Check statistics are accurate
5. Verify loading states

### **4. User Dashboard Test**

1. Login as regular user
2. Check user statistics
3. View user's reports
4. Verify points and level display
5. Test "Report New Issue" button

### **5. Admin Dashboard Test**

1. Login as admin user
2. View all reports
3. Test status updates
4. Test contractor assignment
5. Verify admin statistics

### **6. My Reports Test**

1. Navigate to My Reports page
2. Verify user's reports are listed
3. Check report details
4. Test loading states

## 🐛 **Common Issues & Solutions**

### **Authentication Issues**

- **Problem**: Google OAuth not working
- **Solution**: Check Google Cloud Console settings and environment variables

### **Database Issues**

- **Problem**: Reports not saving
- **Solution**: Verify MongoDB connection and schema validation

### **CORS Issues**

- **Problem**: Frontend can't connect to backend
- **Solution**: Check CORS configuration in backend/server.js

### **Image Upload Issues**

- **Problem**: Images not uploading
- **Solution**: Configure Cloudinary or use local storage

### **Map Data Issues**

- **Problem**: Map not showing reports
- **Solution**: Check map data endpoint and coordinate format

## 📊 **Expected Data Flow**

### **Report Submission**

1. User fills form → Frontend validation
2. Frontend sends POST to `/api/reports`
3. Backend validates and saves to MongoDB
4. Backend returns success response
5. Frontend shows success message

### **Map Data Loading**

1. Frontend calls GET `/api/map/data`
2. Backend queries MongoDB for reports
3. Backend calculates statistics
4. Backend returns reports + stats
5. Frontend displays data

### **Admin Actions**

1. Admin clicks action button
2. Frontend sends PATCH to admin endpoint
3. Backend updates database
4. Backend returns updated data
5. Frontend refreshes display

## 🔒 **Security Features**

- [ ] JWT token authentication
- [ ] Role-based access control
- [ ] Input validation
- [ ] Rate limiting
- [ ] CORS protection
- [ ] Helmet security headers
- [ ] MongoDB injection protection

## 📱 **Responsive Design**

- [ ] Mobile-friendly interface
- [ ] Tablet optimization
- [ ] Desktop layout
- [ ] Touch-friendly controls
- [ ] Proper loading states

## 🚀 **Performance**

- [ ] Fast page loads
- [ ] Efficient API calls
- [ ] Proper error handling
- [ ] Loading indicators
- [ ] Optimized images

## 📝 **Notes**

- All features should work with real MongoDB data
- Google OAuth requires proper setup
- Admin users need to be configured in environment
- Image upload requires Cloudinary or similar service
- Map features work with coordinate data
- Statistics are calculated in real-time
