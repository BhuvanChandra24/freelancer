# API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## Authentication Endpoints

### 1. Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "username": "manager1",
  "password": "123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "username": "manager1",
    "role": "manager",
    "departments": ["Production", "Sales"]
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

## Task Endpoints

All task endpoints require `Authorization: Bearer <token>` header

### 2. Get All Tasks
**Endpoint:** `GET /tasks`

**Query Parameters:**
- `search` (optional): Search by title
- `department` (optional): Filter by department

**Example:**
```
GET /tasks?search=batch&department=Production
```

**Response (200):**
```json
[
  {
    "_id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "title": "Prepare production batch",
    "description": "Prepare the first batch for production run",
    "department": "Production",
    "assignedTo": {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "username": "emp1"
    },
    "deadline": "2026-04-26T10:00:00.000Z",
    "status": "pending",
    "priority": "high",
    "extraFields": {
      "machine": "M1",
      "shift": "morning"
    },
    "deadlineStatus": "urgent",
    "createdAt": "2026-04-26T08:00:00.000Z",
    "updatedAt": "2026-04-26T08:00:00.000Z"
  },
  ...
]
```

---

### 3. Get Single Task
**Endpoint:** `GET /tasks/:id`

**Example:**
```
GET /tasks/64f1a2b3c4d5e6f7g8h9i0j1
```

**Response (200):** Same as above for single task

**Error (404):**
```json
{
  "message": "Task not found"
}
```

---

### 4. Create Task (Manager Only)
**Endpoint:** `POST /tasks`

**Request:**
```json
{
  "title": "New Production Task",
  "description": "Task description here",
  "department": "Production",
  "assignedTo": "64f1a2b3c4d5e6f7g8h9i0j2",
  "deadline": "2026-04-28T14:00:00",
  "priority": "high",
  "extraFields": {
    "machine": "M2",
    "shift": "afternoon",
    "batchId": "B002"
  }
}
```

**Response (201):** Task object (same structure as GET)

**Error (403):**
```json
{
  "message": "Only managers can create tasks"
}
```

---

### 5. Update Task
**Endpoint:** `PUT /tasks/:id`

**Request (Employee - can only update status):**
```json
{
  "status": "completed"
}
```

**Request (Manager - can update all fields):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "deadline": "2026-04-28T16:00:00",
  "priority": "medium",
  "status": "in-progress",
  "extraFields": {
    "machine": "M3"
  }
}
```

**Valid status values:** `pending`, `in-progress`, `completed`

**Response (200):** Updated task object

---

### 6. Delete Task (Manager Only)
**Endpoint:** `DELETE /tasks/:id`

**Response (200):**
```json
{
  "message": "Task deleted"
}
```

**Error (403):**
```json
{
  "message": "Only managers can delete tasks"
}
```

---

## MIS Report Endpoints

### 7. Get MIS Statistics (Manager Only)
**Endpoint:** `GET /mis`

**Response (200):**
```json
{
  "summary": {
    "totalTasks": 10,
    "completedTasks": 3,
    "pendingTasks": 5,
    "inProgressTasks": 2,
    "overdueTasks": 1,
    "upcomingTasks": 4,
    "completionRate": 30
  },
  "departmentStats": [
    {
      "_id": "Production",
      "total": 6,
      "completed": 2,
      "pending": 3,
      "inProgress": 1
    },
    {
      "_id": "Sales",
      "total": 3,
      "completed": 1,
      "pending": 1,
      "inProgress": 1
    }
  ],
  "employeePerformance": [
    {
      "_id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "employeeName": "emp1",
      "totalAssigned": 4,
      "completed": 1,
      "pending": 2,
      "inProgress": 1,
      "completionRate": 25
    }
  ],
  "priorityStats": [
    {
      "_id": "high",
      "count": 4
    },
    {
      "_id": "medium",
      "count": 4
    },
    {
      "_id": "low",
      "count": 2
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "message": "Not authorized"
}
```

### 404 Not Found
```json
{
  "message": "Task not found"
}
```

### 500 Server Error
```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"manager1","password":"123"}'
```

### Get Tasks (with token)
```bash
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "New Task",
    "department": "Production",
    "assignedTo": "64f1a2b3c4d5e6f7g8h9i0j2",
    "deadline": "2026-04-28T14:00:00",
    "priority": "high"
  }'
```

### Update Task Status
```bash
curl -X PUT http://localhost:5000/api/tasks/64f1a2b3c4d5e6f7g8h9i0j1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"status":"completed"}'
```

### Get MIS Reports
```bash
curl -X GET http://localhost:5000/api/mis \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Request/Response Headers

**Required Headers:**
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Response Headers:**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

---

## Rate Limiting

Currently: No rate limiting (add in production)

---

## Pagination

Currently: All tasks returned (add in production for performance)

---

## Change Log

### v1.0.0
- Initial release
- Login with JWT
- Task CRUD operations
- MIS dashboard
- Role-based access control
