#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
frontend:
  - task: "Uninterrupted video entrance (launch-sequence.tsx)"
    implemented: true
    working: true
    file: "/app/frontend/components/staarwardd/launch-sequence.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Fixed autoplay: video now ALWAYS starts muted regardless of saved sound prefs (browser muted-autoplay allowed). Added codec-aware src pick (H.264 mp4 in real browsers, VP9 webm fallback for codec-less browsers like Playwright Chromium) plus error-event fallback swap. ENABLE SOUND unmutes and continues same timeline. Self-heal retry play in poll loop. Verified via screenshot: t advances past 1s with zero clicks, portals overlay moving video, auto Hub transition, sound toggle works without restart."

test_plan:
  current_focus:
    - "Full frontend regression: entrance video, Hub, Judge Reset, demo flow"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Video entrance fixed (muted autoplay + webm codec fallback for headless Chromium). Requesting full frontend regression: 1) fresh / load plays 29s video, currentTime advances >1s with NO clicks, 2) ENABLE SOUND unmutes without restarting, 3) portal overlays appear over moving video near end, 4) auto-transition to Hub at video end, 5) Skip button works, 6) direct /hub renders canonical hub, 7) Judge Reset clears memory and replays entrance, 8) core demo flow (Work evening -> Wellbeing morning coordination) still works. No still Guardian images in entrance."

  - task: "Judge Reset hard-navigates to clean root entrance"
    implemented: true
    working: true
    file: "/app/frontend/components/staarwardd/judge-reset.tsx, /app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "User regression: reset left judge on Hub because index.tsx held sessionEntered=true in mounted state; router.replace('/') re-showed the stale screen. Fix: web uses window.location.assign('/') for a guaranteed clean page load; native passes a reset=Date.now() param that index.tsx watches to drop session state. Verified via screenshot both paths: direct /hub -> reset -> video playing (t=3.4s advancing, url=/), and session Hub (after skip) -> reset -> entrance replays (t=3.5s). Direct /hub fast path untouched."

  - task: "Judge Reset one-tap (modal removed)"
    implemented: true
    working: true
    file: "/app/frontend/components/staarwardd/judge-reset.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "User repro: single click on the visible hub button did nothing because the button only OPENED a confirmation modal (prior 'pass' was a false positive — the test also clicked the modal confirm). Fix: removed the modal entirely; the visible accessible button (role=button, name='Judge reset — replay the full opening for a new judge') now directly clears all seen flags/provider memory and hard-reloads to clean '/' via window.location.assign on web (reset param on native). Verified by clicking the REAL button via accessibility role+name: (1) fresh /hub -> 1 click -> URL '/', body 'Guardian video entrance', traverse webm t=3.9s advancing; (2) /?flow_reset=1 -> SKIP -> 1 click -> clean '/' with traverse entrance t=3.8s advancing."
