# Security Spec

## Data Invariants
- A `User` document can only be written by the matching authenticated user, or an admin.
- An `Exam` document can only be created by an authenticated user. Only the `ownerId` can update or delete it.
- A `Submission` document can be created by any authenticated student. Once created, it cannot be modified by the student (it's terminal).

## The Dirty Dozen Payloads
1. Attempt to create User with `role: "admin"`
2. Attempt to update another user's email
3. Attempt to create an Exam with fake `ownerId`
4. Attempt to update an Exam without being the `owner`
5. Attempt to create Submission for a non-existent Exam
6. Attempt to modify Submission score after creation
7. Attempt to delete another user's Submission
8. Attempt to mass read Submissions without being exam owner
9. Attempt to inject large string into Exam `title`
10. Attempt to read exams without authentication
11. Attempt to create Exam with missing `totalScore`
12. Attempt to set `showResultAfter` as a string instead of boolean

## Rules Testing Strategy
We will draft `DRAFT_firestore.rules` handling validation and test using `@firebase/eslint-plugin-security-rules`.
