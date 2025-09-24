# Polling System API Documentation

## Teacher APIs

### Register Teacher
- **POST** `/api/teacher/register`
- **Body:**
  ```json
  {
    "name": "Teacher Name"
  }
  ```
- **Response:**
  - 201: Teacher object
  - 400: `{ "error": "Name required" }`
  - 500: `{ "error": "..." }`

### Create a New Poll
- **POST** `/api/teacher/polls`
- **Body:**
  ```json
  {
    "title": "Poll Title",
    "createdBy": "Teacher Name"
  }
  ```
- **Response:**
  - 201: Poll object
  - 500: `{ "error": "..." }`

### Ask a New Question
- **POST** `/api/teacher/polls/:pollId/questions`
- **Body:**
  ```json
  {
    "text": "Question text?",
    "options": ["Option 1", "Option 2", "Option 3"]
  }
  ```
- **Response:**
  - 201: Question object (with `isActive: true`, `expiresAt` 60s from now)
  - 400: `{ "error": "Previous question still active" }` or `{ "error": "Poll not found" }`
  - 500: `{ "error": "..." }`
- **Rules:**
  - Only allowed if no question has been asked yet, or all students have answered the previous question (i.e., previous question is not active).
  - Emits `new-question` event via Socket.io to all clients.
  - Each question is active for 60 seconds (`expiresAt`).

### View Live Polling Results
- **GET** `/api/teacher/polls/:pollId/results`
- **Response:**
  ```json
  {
    "poll": "Poll Title",
    "results": [
      {
        "question": "Question text?",
        "options": ["Option 1", "Option 2"],
        "counts": { "Option 1": 2, "Option 2": 3 },
        "isActive": false,
        "expiresAt": "2025-09-22T12:34:56.000Z"
      }
    ]
  }
  ```
- **Errors:**
  - 404: `{ "error": "Poll not found" }`
  - 500: `{ "error": "..." }`

---

## Student APIs

### Register Student (Unique per Tab)
- **POST** `/api/student/register`
- **Body:**
  ```json
  {
    "name": "Student Name"
  }
  ```
- **Response:**
  - 201: Student object
  - 400: `{ "error": "Name required" }`
  - 500: `{ "error": "..." }`

### Get Active Question for a Poll
- **GET** `/api/student/polls/:pollId/active-question`
- **Response:**
  - 200: Question object (if active)
  - 404: `{ "error": "No active question" }`
  - 500: `{ "error": "..." }`

### Submit Answer
- **POST** `/api/student/questions/:questionId/answer`
- **Body:**
  ```json
  {
    "studentId": "<student_id>",
    "answer": "Option 1"
  }
  ```
- **Response:**
  - 201: Answer object
  - 400: `{ "error": "Question not active" }`, `{ "error": "Time expired" }`, `{ "error": "Already answered" }`
  - 500: `{ "error": "..." }`
- **Rules:**
  - Only one answer per student per question.
  - Must be within 60 seconds of question creation (`expiresAt`).
  - Emits `answer-submitted` event via Socket.io to all clients.

### View Results After Submission or Timeout
- **GET** `/api/student/questions/:questionId/results?studentId=<student_id>`
- **Response:**
  - 200: 
    ```json
    {
      "question": "Question text?",
      "options": ["Option 1", "Option 2"],
      "counts": { "Option 1": 2, "Option 2": 3 }
    }
    ```
  - 403: `{ "error": "Results not available yet" }` (if question is still active and student hasn't answered)
  - 404: `{ "error": "Question not found" }`
  - 500: `{ "error": "..." }`
- **Rules:**
  - Results are available after the student answers or after 60 seconds (when question is no longer active).

---

## Notes
- All endpoints return JSON.
- Use the `studentId` returned from registration for answer submission and result viewing.
- Timing and answer rules are enforced by the backend.
- Some endpoints emit real-time events via Socket.io (`new-question`, `answer-submitted`).
