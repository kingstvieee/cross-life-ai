import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GuardianCharacter } from "@/components/staarwardd/guardian-character";
import { useAuth } from "@/src/auth";

type Skill = { skill_id: string; version: string; connector: string; capability: string; risk: string; retry_limit: number; timeout_seconds: number };
type Grant = { grant_id: string; connector: string; capability: string; resource: string; autonomy: string; max_risk: string; created_at: number; expires_at: number; revoked_at: number | null };
type Run = { run_id: string; lane_id: string; skill_id: string; objective: string; status: string; reason: string | null; attempts: number; retry_limit: number; deadline: number; plan_hash: string; approval_preview: { what: string; data: string; destination: string; reversible: boolean; reason: string }; evidence: { passed: boolean; criterion: string } | null };
type Proposal = { proposal_id: string; summary: string; status: string };
type ControlStatus = { mode: string; safe_mode: boolean; skills: Skill[]; grants: Grant[]; runs: Run[]; memory_proposals: Proposal[]; audit: { id: string; kind: string; reason: string | null; timestamp: number }[] };

export function GuardianControlSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useAuth();
  const [status, setStatus] = useState<ControlStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [skillId, setSkillId] = useState("files.write_preview");
  const [resource, setResource] = useState("guardian-demo");
  const [value, setValue] = useState("Guardian simulation: scoped, checked, and under your control.");
  const [resumeReview, setResumeReview] = useState(false);
  const [grantReview, setGrantReview] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const requestKey = useRef<string | null>(null);

  const request = useCallback(async (path: string, body?: unknown) => {
    const response = await api(`/api/guardian/control${path}`, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(typeof result?.detail === "string" ? result.detail.replaceAll("_", " ") : `Request failed (${response.status}).`);
    }
    return response.json();
  }, [api]);

  const load = useCallback(async () => {
    try {
      const result = await request("/status");
      if (openRef.current) { setStatus(result); setError(""); }
    } catch (err) {
      if (openRef.current) setError(err instanceof Error ? err.message : "Could not load Guardian controls.");
    }
  }, [request]);

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setGrantReview(false);
    setResumeReview(false);
    void load();
    const timer = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(timer);
  }, [open, load]);

  const change = async (path: string, body: unknown = {}) => {
    setBusy(true);
    setError("");
    try { const result = await request(path, body); await load(); return result; }
    catch (err) { setError(err instanceof Error ? err.message : "Guardian control request failed."); return null; }
    finally { setBusy(false); }
  };

  const skill = status?.skills.find((item) => item.skill_id === skillId);
  const plan = async () => {
    // Retain the key across an uncertain network failure to avoid duplicate runs.
    if (!requestKey.current) requestKey.current = `ui_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const result = await change("/runs", { skill_id: skillId, resource, value, request_key: requestKey.current, trigger: "user" });
    if (result) requestKey.current = null;
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={["#030715", "#17233B", "#241634"]} style={s.root}>
        <View style={s.header}>
          <View style={s.headerCopy}><Text style={s.title}>Guardian Permission Centre</Text><Text style={s.kicker}>YOUR ACCESS · YOUR FINISH LINE · YOUR STOP SWITCH</Text></View>
          <Button title="Close" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.guardian}><View style={s.orbit} /><GuardianCharacter state={status?.safe_mode ? "concerned" : "hover"} mood="calm" size={180} />
            {(["files", "calendar", "creative"] as const).map((connector, index) => <Pressable key={connector} accessibilityRole="button" accessibilityLabel={`Inspect simulated ${connector} connection`} disabled={busy} onPress={() => { setSkillId(connector === "files" ? "files.write_preview" : connector === "calendar" ? "calendar.propose_event" : "creative.connector_health_check"); setGrantReview(false); requestKey.current = null; }} style={[s.node, index === 0 ? s.nodeLeft : index === 1 ? s.nodeRight : s.nodeBottom]}><Text style={s.gold}>{connector.toUpperCase()}</Text><Text style={s.small}>SIMULATED</Text></Pressable>)}
          </View><Text style={s.body}>I’m here. Every action below stays inside the simulation.</Text>
          <View style={s.card}>
            <Text style={s.gold}>{status?.safe_mode ? "SAFE MODE ACTIVE" : "SIMULATION MODE"}</Text>
            <Text style={s.body}>Files, calendar and creative connections are mocked. No service, device, message or payment is affected.</Text>
            <Button danger title="Emergency stop · Safe Mode" onPress={() => { void change("/safe-mode", { enabled: true }); }} />
            {status?.safe_mode && <Button title="Review resume" onPress={() => setResumeReview(true)} disabled={busy} />}
            {resumeReview && <View><Text style={s.body}>Resume opens simulation planning. Existing grants stay revoked and stopped runs stay stopped.</Text><Button title="Confirm resume" onPress={() => { setResumeReview(false); void change("/safe-mode", { enabled: false, confirm_resume: true }); }} disabled={busy} /></View>}
          </View>
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {!status && <Button title="Reload controls" onPress={() => { void load(); }} />}
          {status && <>
            <View style={s.card}>
              <Text style={s.heading}>Prepare one bounded loop</Text>
              {status.skills.map((item) => <Button key={item.skill_id} title={`${item.skill_id === skillId ? "✓ " : ""}${item.skill_id}`} onPress={() => { setSkillId(item.skill_id); setGrantReview(false); requestKey.current = null; }} disabled={busy} />)}
              <Text style={s.label}>Exact simulated resource</Text>
              <TextInput accessibilityLabel="Exact simulated resource" style={s.input} value={resource} onChangeText={(text) => { setResource(text); setGrantReview(false); requestKey.current = null; }} maxLength={96} autoCapitalize="none" />
              <Text style={s.label}>Draft data · exclude passwords and personal details</Text>
              <TextInput accessibilityLabel="Simulation draft data" style={[s.input, s.multiline]} value={value} onChangeText={(text) => { setValue(text); requestKey.current = null; }} maxLength={2000} multiline />
              <Text style={s.body}>{skill?.risk} risk · {skill?.timeout_seconds}s finish line · {skill?.retry_limit} repair attempt · independent check required</Text>
              <Button title="Review access grant" onPress={() => setGrantReview(true)} disabled={busy || status.safe_mode || !skill} />
              {grantReview && skill && <View style={s.review}>
                <Text style={s.gold}>Grant {skill.capability} on {skill.connector}:{resource}</Text>
                <Text style={s.body}>A2: confirm each action. Business data only. Expires in one hour. Simulation only.</Text>
                <Button title="Confirm this exact grant" onPress={async () => { const result = await change("/grants", { connector: skill.connector, capability: skill.capability, resource, autonomy: "A2", max_risk: skill.risk, sensitivity: "business", expires_in_seconds: 3600 }); if (result) setGrantReview(false); }} disabled={busy} />
              </View>}
              <Button title="Prepare plan" onPress={() => { void plan(); }} disabled={busy || status.safe_mode} />
            </View>
            <View style={s.card}>
              <Text style={s.heading}>Access grants</Text>
              {!status.grants.length && <Text style={s.body}>No access granted.</Text>}
              {status.grants.slice().reverse().map((grant) => <View key={grant.grant_id} style={s.review}>
                <Text style={s.gold}>{grant.connector} · {grant.capability} · {grant.resource}</Text>
                <Text style={s.body}>{grant.autonomy} · {grant.max_risk} risk ceiling · {grant.revoked_at !== null ? "Revoked" : grant.expires_at * 1000 <= Date.now() ? "Expired" : `Expires ${new Date(grant.expires_at * 1000).toLocaleTimeString()}`}</Text>
                {grant.revoked_at === null && <Button title="Revoke" onPress={() => { void change(`/grants/${grant.grant_id}/revoke`); }} disabled={busy} />}
              </View>)}
            </View>
            <View style={s.card}>
              <Text style={s.heading}>Loop activity</Text>
              {!status.runs.length && <Text style={s.body}>Prepare a plan to see its checks here.</Text>}
              <Text style={s.small}>Blocked or expired runs require a new plan after access is corrected.</Text>
              {status.runs.slice().reverse().map((run) => <View key={run.run_id} style={s.review}>
                <Text style={s.gold}>{run.objective}</Text><Text style={s.body}>{run.status.replaceAll("_", " ")} · attempts {run.attempts}/{run.retry_limit + 1}</Text>
                <Text style={s.small}>Run {run.run_id.slice(0, 8)} · lane {run.lane_id.slice(0, 8)}</Text>
                {!!run.reason && <Text style={s.body}>{run.reason.replaceAll("_", " ")}</Text>}
                {run.status === "approval_needed" && <View>
                  <Text style={s.body}>{run.approval_preview.what}</Text><Text style={s.body}>Data: {run.approval_preview.data || "Scoped status only"}</Text><Text style={s.body}>Destination: {run.approval_preview.destination}</Text><Text style={s.body}>Reversible: {run.approval_preview.reversible ? "Yes" : "No"}</Text><Text style={s.body}>{run.approval_preview.reason}</Text>
                  <Button title="Approve this exact simulation" onPress={() => { void change(`/runs/${run.run_id}/approve`, { plan_hash: run.plan_hash }); }} disabled={busy} />
                </View>}
                {["planned", "repair_needed"].includes(run.status) && <Button title="Continue · check permissions" onPress={() => { void change(`/runs/${run.run_id}/advance`); }} disabled={busy || status.safe_mode} />}
                {run.status === "verifying" && <Button title="Check stored result independently" onPress={() => { void change(`/runs/${run.run_id}/verify`); }} disabled={busy || status.safe_mode} />}
                {["planned", "approval_needed", "verifying", "repair_needed"].includes(run.status) && <Button title="Stop this loop" onPress={() => { void change(`/runs/${run.run_id}/cancel`); }} disabled={busy} />}
                {!!run.evidence && <Text style={s.body}>Checker: {run.evidence.passed ? "Passed" : "Failed"} · {run.evidence.criterion.replaceAll("_", " ")}</Text>}
              </View>)}
            </View>
            <View style={s.card}><Text style={s.heading}>Memory proposals</Text><Text style={s.body}>Verified lessons stay proposed until you choose. Retention is restricted to STAARWAARDD and expires after 24 hours.</Text>
              {status.memory_proposals.slice().reverse().map((proposal) => <View key={proposal.proposal_id} style={s.review}><Text style={s.gold}>{proposal.summary}</Text><Text style={s.body}>{proposal.status.replaceAll("_", " ")}</Text>{proposal.status === "proposed" && <><Button title="Retain for this project" disabled={busy || status.safe_mode} onPress={() => { void change(`/memory/${proposal.proposal_id}/resolve`, { retain: true }); }} /><Button title="Discard" disabled={busy || status.safe_mode} onPress={() => { void change(`/memory/${proposal.proposal_id}/resolve`, { retain: false }); }} /></>}</View>)}
            </View>
            <View style={s.card}><Text style={s.heading}>Recent audit history</Text><Text style={s.body}>Appended by the server. Simulation events only.</Text>{status.audit.slice().reverse().slice(0, 15).map((event) => <Text key={event.id} style={s.small}>{new Date(event.timestamp * 1000).toLocaleTimeString()} · {event.kind.replaceAll("_", " ")}{event.reason ? ` · ${event.reason.replaceAll("_", " ")}` : ""}</Text>)}</View>
          </>}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

function Button({ title, onPress, disabled = false, danger = false }: { title: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, danger && s.danger, disabled && s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}

const s = StyleSheet.create({
  orbit: { position: "absolute", top: 12, width: 235, height: 235, borderRadius: 118, borderWidth: 1, borderColor: "rgba(232,200,111,0.45)", alignSelf: "center" }, node: { position: "absolute", borderRadius: 16, padding: 10, borderWidth: 1, borderColor: "#8D7E52", backgroundColor: "#162139", alignItems: "center" }, nodeLeft: { left: 0, top: 74 }, nodeRight: { right: 0, top: 74 }, nodeBottom: { bottom: 0, alignSelf: "center" },
  root: { flex: 1 }, header: { paddingTop: 48, paddingHorizontal: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 10 }, headerCopy: { flex: 1 }, title: { color: "#FAF2DA", fontSize: 21, fontWeight: "800" }, kicker: { color: "#C4B5D9", fontSize: 9, letterSpacing: 1, marginTop: 6 }, content: { padding: 18, paddingBottom: 60, width: "100%", maxWidth: 800, alignSelf: "center" }, guardian: { minHeight: 280, alignItems: "center", justifyContent: "center", paddingBottom: 28 }, card: { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: "rgba(232,200,111,0.3)", backgroundColor: "rgba(8,12,24,0.75)", marginBottom: 16 }, heading: { color: "#FAF2DA", fontSize: 18, fontWeight: "800", marginBottom: 8 }, gold: { color: "#E8C86F", fontSize: 13, fontWeight: "700" }, body: { color: "#E1E4EE", fontSize: 13, lineHeight: 20, marginVertical: 5 }, small: { color: "#AEB9D0", fontSize: 11, lineHeight: 18, marginTop: 5 }, label: { color: "#C7D1E4", fontSize: 12, marginTop: 14, marginBottom: 6 }, input: { borderRadius: 12, borderWidth: 1, borderColor: "#52627C", color: "#FFFFFF", padding: 12, backgroundColor: "#0A1020" }, multiline: { minHeight: 88, textAlignVertical: "top" }, button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#243752", borderWidth: 1, borderColor: "#6D86A9", marginTop: 8 }, buttonText: { color: "#F9F4E8", fontSize: 12, fontWeight: "700" }, danger: { backgroundColor: "#661E31", borderColor: "#EF8092" }, disabled: { opacity: 0.4 }, review: { padding: 12, borderRadius: 14, backgroundColor: "rgba(232,200,111,0.06)", marginTop: 12 }, error: { color: "#FFA5AC", padding: 12, fontSize: 14 },
});
