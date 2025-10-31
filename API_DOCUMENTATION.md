# HandyGO Frontend-Backend API Documentation

## Base URL
```
https://loud-starling-77.deno.dev
```

---

## 1. Task API

### 1.1 GET /tasks - Get All Tasks

**Description:** Get a list of all tasks

**Request:**
```http
GET /tasks
```

**Response (200 OK):**
```json
[
  {
    "id": "259ef722-6e19-4ad9-ac93-61a9d3b9f1c2",
    "name": "Test",
    "description": "Test",
    "time": "2025-10-29T21:50:33.373Z",
    "completed": false,
    "category": "OTHER",
    "email": null
  },
  {
    "id": "47d28a29-2735-4712-8b0f-c1907646246c",
    "name": "Find someone help me to move",
    "description": "222",
    "time": "2025-10-24T11:09:11.350Z",
    "completed": false,
    "category": "OTHER",
    "email": null
  }
]
```

**⚠️ Current Backend Response Fields (Verified 2024-01-15):**
- ✅ `id` - Task ID
- ✅ `name` - Task title
- ✅ `description` - Task description
- ✅ `time` - Creation timestamp
- ✅ `completed` - Completion status
- ✅ `category` - Category
- ✅ `email` - Publisher email (can be null)
- ❌ `price` - **Missing - Frontend requires but backend not returning**
- ❌ `location` - **Missing - Frontend requires but backend not returning**
- ❌ `type` - **Missing - Frontend reserved but not implemented**
- ❌ `userId` - **Missing - Frontend reserved but not implemented**

**Response Fields:**
| Field | Type | Current Status | Description |
|-------|------|----------------|-------------|
| `id` | string (UUID) | ✅ Available | Unique task identifier |
| `name` | string | ✅ Available | Task title/name |
| `description` | string | ✅ Available | Detailed task description |
| `time` | string (ISO 8601) | ✅ Available | Creation timestamp |
| `completed` | boolean | ✅ Available | Whether the task is completed |
| `category` | string | ✅ Available | Task category |
| `email` | string/null | ✅ Available | Publisher email (can be null) |
| `price` | string | ❌ **Missing** | Price in euros - **Frontend requires but backend not returning** |
| `location` | string | ❌ **Missing** | Location address - **Frontend requires but backend not returning** |
| `type` | string | ❌ **Missing** | "need" or "offer" - **Frontend reserved but not implemented** |
| `userId` | string | ❌ **Missing** | User ID - **Frontend reserved but not implemented** |

---

### 1.2 POST /tasks - Create New Task

**Description:** Create a new task

**Request:**
```http
POST /tasks
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Need help moving furniture",
  "description": "I need help moving my furniture from dorm A to dorm B.",
  "price": "30",
  "location": "Aalto Campus, Espoo",
  "category": "Moving",
  "type": "need",
  "userId": "user123"
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Task title/name |
| `description` | string | Yes | Detailed task description |
| `price` | string | Yes | Price in euros |
| `location` | string | Yes | Location address |
| `category` | string | No | Task category |
| `type` | string | Yes | Either "need" or "offer" |
| `userId` | string | Yes | ID of the user creating the task |

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Need help moving furniture",
  "description": "I need help moving my furniture from dorm A to dorm B.",
  "price": "30",
  "location": "Aalto Campus, Espoo",
  "category": "Moving",
  "type": "need",
  "time": "2024-01-15T10:30:00Z",
  "completed": false,
  "userId": "user123"
}
```

---

### 1.3 GET /tasks/:id - Get Single Task

**Description:** Get details of a specific task

**Request:**
```http
GET /tasks/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Need help moving furniture",
    "description": "I need help moving my furniture from dorm A to dorm B. It's just one room worth of furniture.",
    "price": "30",
    "location": "Aalto Campus, Espoo",
    "category": "Moving",
    "type": "need",
    "time": "2024-01-15T10:30:00Z",
    "completed": false,
    "userId": "user123"
  }
]
```

**Note:** The API currently returns an array with a single task object. The frontend handles this by extracting the first element.

---

### 1.4 POST /tasks/:id - Update Task

**Description:** Update an existing task

**Request:**
```http
POST /tasks/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Need help moving furniture - UPDATED",
  "description": "Updated description",
  "price": "35",
  "location": "Otaniemi, Espoo",
  "category": "Moving",
  "completed": false
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Need help moving furniture - UPDATED",
  "description": "Updated description",
  "price": "35",
  "location": "Otaniemi, Espoo",
  "category": "Moving",
  "type": "need",
  "time": "2024-01-15T10:30:00Z",
  "completed": false,
  "userId": "user123"
}
```

---

### 1.5 POST /tasks/:id/delete - Delete Task

**Description:** Delete a task

**Request:**
```http
POST /tasks/550e8400-e29b-41d4-a716-446655440000/delete
```

**Response (200 OK):**
```json
{
  "message": "task deleted"
}
```

---

## 2. Task Data Model (Summary)

### Complete Task Object Structure:
```typescript
interface Task {
  id: string;              // UUID format
  name: string;            // Task title
  description: string;     // Full description
  price: string;           // Price in euros (e.g., "30", "0")
  location: string;        // Physical address
  category: string;        // Optional category (e.g., "Moving", "Textbooks")
  type: "need" | "offer";  // Post type
  time: string;            // ISO 8601 timestamp
  completed: boolean;      // Completion status
  userId: string;          // User who created the task
}
```

---

## 3. Frontend Expected Behavior

### 3.1 Search Page (`/search`)
- Fetches all tasks from `GET /tasks`
- Filters by:
  - `name` and `description` (for search query)
  - `price` (min/max range)
  - `type` (need/offer) - *pending backend support*
- Sorts by relevance (calculated on frontend) or `time` (newest first)
- Expects `time` field to calculate "Just now", "24h ago", etc.

### 3.2 Task Detail Page (`/task/:id`)
- Fetches single task from `GET /tasks/:id`
- Displays: `name`, `description`, `price`, `location`, `category`
- Currently handles API returning array by extracting first element

### 3.3 Create Task Page (`/post`)
- Submits to `POST /tasks` with: `name`, `description`, `price`
- Frontend currently sends these 3 fields (missing: `location`, `category`, `type`, `userId`)

---

## 4. Required Backend Updates

### 4.1 Current Issue: Missing Fields in POST Request
**Frontend sends:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30"
}
```

**Backend should accept and store:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30",
  "location": "Aalto Campus, Espoo",
  "category": "Moving",
  "type": "need",
  "userId": "user123"
}
```

### 4.2 Database Schema Required Fields
- `id` (UUID, primary key)
- `name` (text, required)
- `description` (text, required)
- `price` (text/decimal, required)
- `location` (text, required) - *currently missing in schema*
- `category` (text, optional) - *currently missing in schema*
- `type` (enum: "need"|"offer", required) - *currently missing in schema*
- `time` (timestamp, auto-generated)
- `completed` (boolean, default false)
- `userId` (text/UUID, required) - *currently missing in schema*

### 4.3 GET /tasks/:id Response Format
**Current:** Returns array `[{...task}]`  
**Recommended:** Return object `{...task}` directly

---

## 5. Additional Notes

### 5.1 Price Format
- Frontend expects `price` as a string (e.g., "30", "45", "0")
- Frontend displays as `€{price}`

### 5.2 Time Format
- Frontend expects ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
- Frontend calculates relative time for posts within a week

### 5.3 Location Format
- Frontend displays location string as-is
- Clickable to open Google Maps
- Frontend can handle addresses like "Aalto Campus, Espoo" or coordinates

### 5.4 Category
- Currently optional field
- Used for grouping and similar task recommendations
- Examples: "Moving", "Textbooks", "Electronics", "Furniture", "Services"

### 5.5 Type
- Must be either "need" or "offer"
- Used for filtering on search page

---

## 6. Testing Examples

### Example 1: Create a "Need" Task
```bash
curl -X POST https://loud-starling-77.deno.dev/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Need help with math homework",
    "description": "I need help with calculus problem set 3. Can meet on campus.",
    "price": "20",
    "location": "Aalto Campus, Espoo",
    "category": "Tutoring",
    "type": "need",
    "userId": "user789"
  }'
```

### Example 2: Create an "Offer" Task
```bash
curl -X POST https://loud-starling-77.deno.dev/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Selling PlayStation 5",
    "description": "PS5, used for 1 year, excellent condition. Includes 2 controllers and 3 games.",
    "price": "400",
    "location": "Otaniemi, Espoo",
    "category": "Electronics",
    "type": "offer",
    "userId": "user456"
  }'
```

### Example 3: Get Single Task
```bash
curl https://loud-starling-77.deno.dev/tasks/550e8400-e29b-41d4-a716-446655440000
```

---

## 7. Error Handling

**Expected Error Response Format:**
```json
{
  "error": "Error message here"
}
```

**Common Error Codes:**
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Server error

---

## 8. Frontend Implementation Status

✅ **Implemented:**
- GET all tasks
- GET single task (with array extraction workaround)
- POST create task (basic fields only)
- Search and filter by name/description
- Price filtering
- Relevance calculation

⚠️ **Pending Frontend Updates:**
- Send `location`, `category`, `type`, `userId` in POST request
- Handle "need" vs "offer" filter on search page
- Display category on task cards

---

## 9. Priority Backend Tasks

1. **HIGH PRIORITY:** Add `location` field to POST request handling
2. **HIGH PRIORITY:** Add `type` field ("need"|"offer") with validation
3. **MEDIUM PRIORITY:** Add `category` field for better organization
4. **MEDIUM PRIORITY:** Add `userId` field for user association
5. **LOW PRIORITY:** Change GET /tasks/:id to return object instead of array

---

---

## 10. Current Status Summary ⚠️

### Key Findings (Based on actual API testing on 2024-01-15):

**✅ Fields Currently Returned by Backend:**
- `id`, `name`, `description`, `time`, `completed`, `category`, `email`

**❌ Fields Missing from Backend but Required by Frontend:**
- `price` - Frontend displays price but backend not returning
- `location` - Frontend displays location but backend not returning

**⚠️ Fields Reserved by Frontend but Not Fully Implemented:**
- `type` - Frontend has toggle button but code is commented out
- `userId` - User system pending implementation

### How Frontend Handles Missing Fields:

Since backend is not returning `price` and `location`, frontend code uses the following fallback:

```javascript
// Price display
{task.price ? `€${task.price}` : 'Price not set'}

// Location display  
{task.location || 'Aalto Campus, Espoo'}
```

**This means:**
- If backend doesn't return these fields, frontend will show default values
- For example: All tasks will display "Price not set" and "Aalto Campus, Espoo"

### Fields Backend Needs to Add Immediately:
1. 🔴 **High Priority:** `price` - Frontend UI needs to display
2. 🔴 **High Priority:** `location` - Frontend UI needs to display
3. 🟡 **Medium Priority:** `type` - Frontend filtering functionality needs
4. 🟡 **Medium Priority:** `userId` - User association needs
5. 🟢 **Low Priority:** `email` may be replaceable with `userId`

---

**Document Version:** 1.1  
**Last Updated:** 2024-01-15  
**Last Verified:** 2024-01-15 (Actual API Testing)  
**Contact:** Frontend team for questions

