# FEATURE

Critical fix for Study Mate AI processing pipeline

# PROBLEM

The core learning workflow is currently broken.

Current issues:

* summary generation fails
* flashcard generation returns zero cards
* AI chatbot assistant does not respond correctly
* uploaded lecture context is not being processed reliably

This is a blocking issue for demo and production deployment.

# ROOT FLOW TO AUDIT

upload file
→ extract text
→ validate extracted content
→ generate summary
→ generate flashcards
→ store session context
→ chatbot uses same context

# EXPECTED BEHAVIOR

After uploading a valid lecture file:

1. extracted text must be validated
2. summary must always generate from extracted content
3. flashcards must generate from summary or source text
4. chatbot must answer from uploaded lecture context
5. visible error messages must appear if any step fails

# SUCCESS CRITERIA

* [ ] summary generates successfully
* [ ] flashcards generate more than 0 cards
* [ ] chatbot answers correctly from uploaded file
* [ ] pipeline errors are visible in UI
* [ ] no silent failures
* [ ] fallback logic exists if summary generation fails

# FILES TO REVIEW

backend upload route
text extraction service
summary service
flashcard service
chat assistant service
frontend upload result handlers

# DEBUG TASKS

Task 1:
Trace the full backend pipeline from upload endpoint to summary generation.

Task 2:
Log extracted text length after upload.
If text length is zero, fix extraction immediately.

Task 3:
Validate summary service:

* check prompt construction
* check LLM / Ollama response
* ensure response parsing does not fail

Task 4:
Fix flashcard generation:

* if summary exists → use summary
* else fallback to extracted text
* ensure returned JSON always contains cards array

Task 5:
Fix chatbot:

* confirm uploaded lecture context is saved
* confirm session context retrieval works
* ensure assistant uses extracted text / summary as knowledge source

# REQUIRED LOGGING

Add logs for:

* upload success
* extracted text length
* summary response status
* flashcard count
* chatbot context retrieval

# UI REQUIREMENTS

Show clear frontend messages:

* "Summary generation failed"
* "No flashcards could be generated"
* "AI assistant unavailable"

Do not leave silent loading states.

# CONSTRAINTS

* preserve current UI layout
* preserve upload flow
* improve production readiness
* follow CLAUDE.md rules
