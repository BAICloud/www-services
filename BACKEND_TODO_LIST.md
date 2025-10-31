# Backend TODO List - Based on Frontend Requirements

## 📋 Overview

This document is a clear, actionable TODO list for backend developers. Based on the current frontend implementation and requirements, it lists all the items that need to be modified or added on the backend.

---

## 🎯 Core Problem Summary

**Current Status:** The frontend UI is complete, but the backend API is missing critical fields, preventing the frontend from displaying properly.

**Missing Impact:**
- ❌ All tasks display "Price not set"
- ❌ All tasks display default address "Aalto Campus, Espoo"
- ❌ Cannot distinguish between "need help" and "offering help"

---

## 🔴 HIGH PRIORITY - Must Fix Immediately

### 1. Add `price` Field

**Why it's needed:**
- Frontend displays price in multiple places
- Users enter price when creating tasks
- Frontend has price filtering functionality

**What backend needs to do:**

**A. Database level:**
```sql
-- Add price column to tasks table
ALTER TABLE tasks ADD COLUMN price TEXT;  -- or use DECIMAL type
```

**B. API level:**

**POST /tasks - Accept price:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30"  // ← Add this field, string format
}
```

**GET /tasks and GET /tasks/:id - Return price:**
```json
{
  "id": "...",
  "name": "...",
  "description": "...",
  "price": "30",  // ← Return this field
  ...
}
```

**Data format:**
- Type: String (e.g., "30", "45.50", "0")
- Frontend display format: `€{price}` (e.g., "€30")
- Can be empty string or "0" to indicate free

---

### 2. Add `location` Field

**Why it's needed:**
- Frontend displays address on detail page
- Address is clickable to open map navigation
- Users enter location when creating tasks

**What backend needs to do:**

**A. Database level:**
```sql
-- Add location column to tasks table
ALTER TABLE tasks ADD COLUMN location TEXT;
```

**B. API level:**

**POST /tasks - Accept location:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30",
  "location": "Aalto Campus, Espoo"  // ← Add this field
}
```

**GET /tasks and GET /tasks/:id - Return location:**
```json
{
  "id": "...",
  "name": "...",
  "price": "30",
  "location": "Aalto Campus, Espoo",  // ← Return this field
  ...
}
```

**Data format:**
- Type: String
- Format examples:
  - "Aalto Campus, Espoo"
  - "Otaniemi, Espoo"
  - "Lat: 60.1882, Lng: 24.8307" (coordinates are also acceptable)

**Note:** Frontend already implements location input and address search. Backend only needs to store and return it.

---

## 🟡 MEDIUM PRIORITY - Recommended

### 3. Add `type` Field ("need" vs "offer")

**Why it's needed:**
- Frontend has "Need/Offer" toggle button
- Users need to distinguish between "requesting help" and "offering help"
- Frontend plans to implement type-based filtering

**What backend needs to do:**

**A. Database level:**
```sql
-- Add type column to tasks table
ALTER TABLE tasks ADD COLUMN type TEXT;
-- Or use enum type
ALTER TABLE tasks ADD COLUMN type VARCHAR(10) CHECK (type IN ('need', 'offer'));
```

**B. API level:**

**POST /tasks - Accept type:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30",
  "location": "Aalto Campus, Espoo",
  "type": "need"  // ← Add this field, must be "need" or "offer"
}
```

**GET /tasks and GET /tasks/:id - Return type:**
```json
{
  "id": "...",
  "location": "Aalto Campus, Espoo",
  "type": "need",  // ← Return this field
  ...
}
```

**Data format:**
- Type: String, must be one of two values
- Possible values: `"need"` or `"offer"`
- `"need"` = User requesting help (e.g., "I need moving help")
- `"offer"` = User offering help (e.g., "I'm selling textbooks")

---

### 4. Add `userId` Field

**Why it's needed:**
- Frontend needs to track who created the task
- Future feature may display publisher information
- Users may only edit their own tasks

**What backend needs to do:**

**A. Database level:**
```sql
-- Add userId column to tasks table
ALTER TABLE tasks ADD COLUMN userId TEXT;  -- or use UUID type
```

**B. API level:**

**POST /tasks - Accept user ID:**
```json
{
  "name": "...",
  "description": "...",
  "price": "30",
  "location": "Aalto Campus, Espoo",
  "type": "need",
  "userId": "user123"  // ← Add this field
}
```

**GET /tasks and GET /tasks/:id - Return user ID:**
```json
{
  "id": "...",
  "type": "need",
  "userId": "user123",  // ← Return this field
  ...
}
```

**Note:** Backend currently returns `email` field, which could be replaced by or kept alongside `userId`.

---

## 🟢 LOW PRIORITY - Optional Improvements

### 5. GET /tasks/:id Return Format

**Current issue:**
- Currently returns array: `[{...task}]`
- Frontend needs extra processing: `task = Array.isArray(data) ? data[0] : data;`

**Recommendation:**
- Return object directly: `{...task}`
- This would simplify frontend code

**Modification example:**
```javascript
// Current backend return
return c.json([task], 200);  // ← Array format

// Suggested change
return c.json(task, 200);    // ← Object format
```

---

## 📝 Complete Field Comparison

### Current backend response fields:
```json
{
  "id": "...",
  "name": "...",
  "description": "...",
  "time": "...",
  "completed": false,
  "category": "...",
  "email": null
}
```

### Frontend requires complete fields:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",      // ✅ Exists
  "name": "Need help moving furniture",              // ✅ Exists
  "description": "I need help...",                   // ✅ Exists
  "price": "30",                                      // ❌ Missing
  "location": "Aalto Campus, Espoo",                 // ❌ Missing
  "category": "Moving",                               // ✅ Exists
  "type": "need",                                     // ❌ Missing
  "time": "2024-01-15T10:30:00Z",                    // ✅ Exists
  "completed": false,                                 // ✅ Exists
  "userId": "user123"                                 // ❌ Missing
}
```

### Fields backend needs to add:
- `price` (HIGH)
- `location` (HIGH)
- `type` (MEDIUM)
- `userId` (MEDIUM)

---

## 🔧 Frontend Current Status

### Data collected by frontend when creating tasks:
```javascript
{
  postType: "need" or "offer",      // Frontend has toggle button
  uploadedImages: [...],            // Frontend has upload (not sent yet)
  postTitle: "...",                 // Maps to name
  description: "...",               // Maps to description
  price: "30",                      // Maps to price
  location: "Aalto Campus, Espoo"   // Maps to location
}
```

### Data frontend sends to backend (current):
```javascript
fetch('/tasks', {
  method: 'POST',
  body: JSON.stringify({
    name: postTitle,
    description: description,
    price: price || '0'  // ← Only these 3 fields sent
  })
})
```

**Frontend pending changes:** Need to send `location`, `type`, `userId`

---

## ✅ Testing Checklist

After completing the modifications, test using the following:

### 1. Test Create Task (POST)
```bash
curl -X POST https://loud-starling-77.deno.dev/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test task with all fields",
    "description": "Testing all new fields",
    "price": "50",
    "location": "Otaniemi, Espoo",
    "type": "need",
    "userId": "test_user_123"
  }'
```

### 2. Test Get Tasks (GET)
```bash
curl https://loud-starling-77.deno.dev/tasks
```

### 3. Verify response includes new fields:
- ✅ `price` field exists and has value
- ✅ `location` field exists and has value
- ✅ `type` field exists and is "need" or "offer"
- ✅ `userId` field exists

---

## 📌 Quick Reference

### Suggested database table structure:
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT,                          -- ← New
  location TEXT,                       -- ← New
  category TEXT,
  type TEXT CHECK (type IN ('need', 'offer')),  -- ← New
  time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  userId TEXT,                         -- ← New
  email TEXT
);
```

### POST /tasks should accept these fields:
```typescript
{
  name: string;        // Required
  description: string; // Required
  price: string;       // Required - New
  location: string;    // Required - New
  type: "need" | "offer";  // Required - New
  userId: string;      // Required - New
}
```

### GET /tasks should return these fields:
```typescript
{
  id: string;
  name: string;
  description: string;
  price: string;       // Required - New
  location: string;    // Required - New
  category: string;
  type: "need" | "offer";  // Required - New
  time: string;
  completed: boolean;
  userId: string;      // Required - New
}
```

---

## 🎯 Summary

**Core backend work needed:**
1. 🔴 Add `price` and `location` fields to database
2. 🔴 Modify POST /tasks to accept these fields
3. 🔴 Modify GET /tasks to return these fields
4. 🟡 Add `type` and `userId` fields (recommended)
5. 🟢 Modify GET /tasks/:id to return object instead of array (optional)

**After completing these, the frontend will work properly!**

---

**Created:** 2024-01-15  
**Last Updated:** 2024-01-15  
**For:** Backend Team  
**From:** Frontend Team
