# Guardian mission batch reconciliation

The STAAR Hub 757 Component Master Ledger supplies 11 batch descriptions
covering SH-001–284. Its per-ID titles and acceptance criteria are pending.
These code and test links establish evidence for the recovered batch behaviors.
The 346–757 remix is mapped in [the foundation ledger](757-foundation.md).

| IDs | Recovered behavior | Repository evidence |
|---|---|---|
| SH-001 | Persist a mission deadline | Proposal API, normalized UTC deadline storage and retry coverage in `backend/tests/test_guardian_mission_routes.py`. Original deadline API commit `1fede06`. |
| SH-002–003 | Restore or take over interrupted work | `guardian_mission_engine.py` recovers expired leases. MongoDB recovery tests verify safe lease transfer and started-work quarantine. Original recovery commit `fecedf4`. |
| SH-004–019 | Control missions through the API | `guardian_mission_routes.py` has owner-scoped read, proposal, withdrawal and pending cancellation APIs. Route and recovery tests cover owner isolation and state conflicts. |
| SH-020–040 | Zero-cost preview lifecycle | `guardian_mission_preview.py` and `guardian_preview_service.py` queue, execute and verify a scoped preview. MongoDB and verifier tests exercise these paths. |
| SH-041–064 | In-app mission console | `frontend/app/guardian-missions.tsx` and `frontend/src/guardian-missions.ts` provide mission creation, history, actions and result inspection. The client and screen contracts run under Node. |
| SH-065–100 | Monitor readiness and record receipts | Notice readiness checks worker-facing delivery health. The preview acknowledgment and inbox-read APIs persist distinct receipts. MongoDB preview and notice tests verify both. |
| SH-101–141 | Filter mission activity by date and state | The console now applies creation bounds to initial and paged results. The API validates bounds and rejects cursors outside the active window. |
| SH-142–182 | Edit mission details and retain revisions | An owner can revise a proposed mission into a fresh, editable proposal with a source link. The original is retained. Derived records start without approval, execution state or evidence. |
| SH-183–212 | Move a scheduled mission while preserving its state | An owner can change an unstarted queued preview's start time. The mutation compares the prior start atomically, respects the deadline and rejects a claimed or previously attempted mission. This implementation covers zero-cost previews. |
| SH-213–253 | Copy terminal missions into new work | An owner can carry the objective and criteria from a completed, cancelled or blocked mission into an editable proposal. The app starts the copy with a blank deadline. The API records the source and does not transfer authority. |
| SH-254–284 | Literal search and sorting | Owner-scoped escaped search, chronological order and cursor handling are in `guardian_mission_routes.py` and the mission console. Commit `b061439` supplies the search API and `d4750b1` supplies the UI. |
| SH-285–305 | Original definitions unavailable | See [the 254–305 Work reconciliation](work-254-305-reconciliation.md). Historical and repository evidence exists at feature level. |
| SH-306–345 | Original definitions unavailable | See [the intake register](sh-306-346-intake.md). SH-346 was subsequently covered in the approved remix. |

Revision and copy preserve their source. A new proposal requires its own
approval before execution. Rescheduling is limited to the zero-cost preview
handler. Live staging verification and device interaction remain open.

The local Guardian regression run passed 310 backend tests against authenticated
MongoDB and 8 frontend mission tests under Node. Native UI acceptance remains
pending. The older detached Guardian worktree's cursor and compound-index
changes were compared with this branch. The current branch already contains
the indexed, owner-scoped pagination behavior.
