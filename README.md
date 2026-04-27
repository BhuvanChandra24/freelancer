# Task Management Dashboard - Complete Setup Guide

## 🎯 Project Overview

A full-stack **Role-Based Task Management Dashboard** with MIS Reporting for manufacturing units. Replaces multiple Google Sheets with a centralized, secure, and efficient system.

### Key Features:
- ✅ Role-based access control (Manager & Employee)
- ✅ Department-wise task management (CRM, Production, Sales, Service)
- ✅ Real-time deadline alerts (Overdue, Urgent, On Track)
- ✅ MIS Dashboard with charts and analytics
- ✅ Search and filter capabilities
- ✅ Employee performance tracking

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, Tailwind CSS, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Authentication** | JWT (JSON Web Tokens) |

---

## 🚀 Installation & Setup

### Prerequisites

Ensure you have installed:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **Git** (optional)

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd task-dashboard/backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

The `.env` file is already created with default values:

```
MONGODB_URI=mongodb://localhost:27017/task-dashboard
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=5000
NODE_ENV=development
```

**For Production:** Update `JWT_SECRET` to a strong value.

### Step 4: Seed Database with Demo Data

```bash
npm run seed
```

This will:
- Connect to MongoDB
- Clear existing data
- Create 4 demo users (1 manager, 3 employees)
- Create 10 sample tasks across departments
- Display demo credentials

**Demo Users:**
```
Manager:  username=manager1, password=123
Employee: username=emp1, password=123
```

### Step 5: Start Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:
```
MongoDB connected
Server running on port 5000
```

**Backend is now running at:** `http://localhost:5000`

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

Open a **new terminal** and run:

```bash
cd task-dashboard/frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

Note: This may take 2-3 minutes as it installs React and dependencies.

### Step 3: Install Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
```

### Step 4: Start Frontend Server

```bash
npm start
```

The frontend will automatically open in your browser at:
**`http://localhost:3000`**

If it doesn't open automatically, manually visit: `http://localhost:3000`

---

## 🔐 Demo Login

Once both servers are running, you can login with:

### Manager Account
```
Username: manager1
Password: 123
```

**Manager can:**
- View tasks from Production & Sales departments
- Create new tasks
- Assign tasks to employees
- Delete tasks
- Access MIS Reports dashboard

### Employee Account
```
Username: emp1
Password: 123
```

**Employee can:**
- View only assigned tasks
- Update task status (Pending → In Progress → Completed)
- View deadlines and alerts

---

## 📊 API Endpoints

### Authentication
```
POST /api/auth/login
Body: { username, password }
Response: { token, user }
```

### Tasks
```
GET /api/tasks                    # Get all tasks (role-filtered)
GET /api/tasks/:id                # Get single task
POST /api/tasks                   # Create task (manager only)
PUT /api/tasks/:id                # Update task
DELETE /api/tasks/:id             # Delete task (manager only)

Query parameters:
  ?search=keyword                 # Search by title
  ?department=Production          # Filter by department
```

### MIS Reports
```
GET /api/mis                      # Get aggregated statistics (manager only)
Returns:
  - summary (total, completed, pending, overdue, completion rate)
  - departmentStats
  - employeePerformance
  - priorityStats
```

---

## 📁 Project Structure

```
task-dashboard/
│
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── User.js               # User schema
│   │   └── Task.js               # Task schema
│   ├── routes/
│   │   ├── auth.js               # Login endpoint
│   │   ├── tasks.js              # Task CRUD
│   │   └── mis.js                # MIS reports
│   ├── middleware/
│   │   └── auth.js               # JWT verification
│   ├── scripts/
│   │   └── seedData.js           # Database seeding
│   ├── server.js                 # Express app setup
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TaskCard.js       # Individual task card
│   │   │   ├── TaskForm.js       # Task creation form
│   │   │   └── ProtectedRoute.js # Route protection
│   │   ├── context/
│   │   │   └── AuthContext.js    # Auth state management
│   │   ├── pages/
│   │   │   ├── LoginPage.js      # Login UI
│   │   │   ├── DashboardPage.js  # Main dashboard
│   │   │   └── MISPage.js        # MIS reports page
│   │   ├── services/
│   │   │   └── api.js            # API client
│   │   ├── utils/
│   │   │   └── helpers.js        # Utility functions
│   │   ├── App.js                # Main app component
│   │   ├── index.js              # React entry point
│   │   └── index.css             # Global styles
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .gitignore
```

---

## 🎨 Features Walkthrough

### 1. Login Page
- Clean, professional design
- Demo credentials displayed
- Error handling for invalid credentials
- JWT token stored in localStorage

### 2. Dashboard (Main)
- **Stats Cards**: Total, Completed, Pending, Overdue tasks
- **Search & Filter**: Find tasks by title or department
- **Task Cards**: 
  - Priority badges (High, Medium, Low)
  - Status indicators (Pending, In Progress, Completed)
  - Deadline alerts (RED=Overdue, YELLOW=<2hrs, GREEN=On Track)
  - Quick actions (Mark Complete, Delete, etc.)
- **Department Grouping**: Tasks organized by department

### 3. Task Management
- **Manager Actions**:
  - Create new tasks with title, description, deadline, priority
  - Assign to specific employees
  - Add extra fields (machine ID, shift, client name)
  - Delete tasks
  
- **Employee Actions**:
  - View assigned tasks
  - Update status
  - View task details

### 4. MIS Dashboard (Manager Only)
- **Summary Cards**: Total, Completed, Pending, Overdue, Upcoming
- **Charts**:
  - Task Status Distribution (Pie Chart)
  - Department-wise Tasks (Bar Chart)
  - Tasks by Priority (Bar Chart)
  - Overall Completion (Pie Chart)
- **Employee Performance Table**:
  - Tasks assigned & completed
  - Completion rate percentage
  - Color-coded performance (Green ≥75%, Yellow 50-75%, Red <50%)

---

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Role-Based Access Control**: Different views for managers and employees
3. **Department Filtering**: Managers see only their departments
4. **Password Hashing**: Bcrypt for secure password storage
5. **Request Authorization**: Backend validates user permissions for each action

---

## 🧪 Sample Data

The seed script creates:

### Users:
- **manager1** (Manager) - Access to Production, Sales
- **emp1** (Employee) - Production department
- **emp2** (Employee) - Sales department
- **emp3** (Employee) - Production department

### Tasks:
- Prepare production batch (Production, emp1, Pending)
- Follow up with client ABC (Sales, emp2, Pending)
- Quality check batch 001 (Production, emp3, In Progress)
- Update CRM with leads (CRM, emp2, Pending)
- And 6 more tasks...

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Start MongoDB service
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Kill process on port 5000
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### CORS Error in Frontend
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Ensure backend is running and CORS is enabled (already configured)

### Blank Dashboard after Login
**Solution:** 
- Check browser console for errors (F12)
- Ensure backend is running at `http://localhost:5000`
- Check if seed data was created (`npm run seed`)

---

## 📈 Scaling Notes

For production deployment:

1. **Database**: Use MongoDB Atlas (cloud)
2. **Backend**: Deploy to Heroku, AWS, or DigitalOcean
3. **Frontend**: Deploy to Vercel, Netlify, or S3+CloudFront
4. **Environment**: Update `.env` with production URLs
5. **Security**: 
   - Change JWT_SECRET
   - Use HTTPS
   - Enable CORS for specific domains
   - Add rate limiting
   - Implement logging and monitoring

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)

---

## 📝 License

This project is open-source and available for educational and commercial use.

---

## 🤝 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review API endpoints and database schema
3. Ensure all dependencies are installed
4. Clear browser cache and restart servers

---

**Happy Task Managing! 🚀**
