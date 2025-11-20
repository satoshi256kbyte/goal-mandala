# Task Management API Specification

## Overview

The Task Management API provides endpoints for managing tasks, notes, and saved views in the Goal Mandala system.

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Base URL

```
https://api.goal-mandala.com/api
```

## Endpoints

### Tasks

#### GET /tasks

Get user's tasks with optional filtering.

**Query Parameters:**

- `status[]` (optional): Filter by task status
- `deadlineRange` (optional): Filter by deadline range
- `actionIds[]` (optional): Filter by action IDs
- `search` (optional): Search query

**Response:**

```json
{
  "tasks": [
    {
      "id": "string",
      "actionId": "string",
      "title": "string",
      "description": "string",
      "type": "execution|habit",
      "status": "not_started|in_progress|completed|skipped",
      "estimatedMinutes": 30,
      "deadline": "2025-12-31T23:59:59Z",
      "completedAt": "2025-01-01T12:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /tasks/:id

Get task details with notes and history.

**Response:**

```json
{
  "task": {
    /* Task object */
  },
  "notes": [
    {
      "id": "string",
      "content": "string",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "history": [
    {
      "id": "string",
      "oldStatus": "not_started",
      "newStatus": "completed",
      "changedAt": "2025-01-01T12:00:00Z"
    }
  ]
}
```

#### PATCH /tasks/:id/status

Update task status.

**Request Body:**

```json
{
  "status": "completed"
}
```

**Response:**

```json
{
  "task": {
    /* Updated task object */
  }
}
```

### Notes

#### POST /tasks/:id/notes

Add note to task.

**Request Body:**

```json
{
  "content": "Note content"
}
```

#### PATCH /tasks/:id/notes/:noteId

Update note.

#### DELETE /tasks/:id/notes/:noteId

Delete note.

### Bulk Operations

#### POST /tasks/bulk/status

Bulk update task status.

**Request Body:**

```json
{
  "taskIds": ["id1", "id2"],
  "status": "completed"
}
```

#### DELETE /tasks/bulk

Bulk delete tasks.

### Saved Views

#### GET /saved-views

Get user's saved views.

#### POST /saved-views

Save a view.

**Request Body:**

```json
{
  "name": "My View",
  "filters": {
    "statuses": ["completed"],
    "deadlineRange": "today"
  },
  "searchQuery": "important"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

- 100 requests per minute per IP
- 429 status code when exceeded

## Security

- All inputs are sanitized
- XSS protection enabled
- CORS configured for allowed origins
- Security headers included
