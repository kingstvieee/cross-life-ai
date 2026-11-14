import SwiftUI
import WatchConnectivity

@main
struct StaarWatchApp: App {
  @StateObject private var connection = WatchConnection()
  var body: some Scene { WindowGroup { WatchHome().environmentObject(connection) } }
}
final class WatchConnection: NSObject, ObservableObject, WCSessionDelegate {
  @Published var status = "Open STAAR Hub on your iPhone"
  @Published var companion = ""
  @Published var verified = false
  private var timer: Timer?
  override init() { super.init(); if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() } }
  func verify() {
    verified = false
    let session = WCSession.default
    guard session.activationState == .activated, session.isReachable else { status = "iPhone is not reachable. Open STAAR Hub."; return }
    status = "Checking iPhone…"
    timer?.invalidate()
    timer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) { [weak self] _ in self?.verified = false; self?.status = "No response. Try with STAAR Hub open." }
    session.sendMessage(["version": 1, "action": "verify"], replyHandler: { [weak self] reply in
      DispatchQueue.main.async { self?.timer?.invalidate(); self?.apply(reply, live: true) }
    }, errorHandler: { [weak self] _ in DispatchQueue.main.async { self?.timer?.invalidate(); self?.verified = false; self?.status = "Connection interrupted. Try again." } })
  }
  private func apply(_ context: [String: Any], live: Bool) {
    guard context["version"] as? Int == 1, let enabled = context["enabled"] as? Bool,
      let name = context["companion"] as? String, let sentAt = context["sentAt"] as? Double,
      abs(Date().timeIntervalSince1970 - sentAt) < 120 else { verified = false; status = "Verify again on your iPhone."; return }
    companion = enabled && ["atlas", "kaia", "guardian"].contains(name) ? name.capitalized : ""
    verified = live && enabled && !companion.isEmpty
    if verified {
      timer?.invalidate()
      timer = Timer.scheduledTimer(withTimeInterval: 120, repeats: false) { [weak self] _ in
        self?.verified = false; self?.status = "Verification expired. Tap Verify iPhone."
      }
    }
    status = enabled ? (live ? "iPhone connection verified" : "Tap Verify for a live check") : "Enable Watch sharing in STAAR Hub on iPhone"
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    DispatchQueue.main.async { self.apply(session.receivedApplicationContext, live: false) }
  }
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async { self.apply(applicationContext, live: false) }
  }
  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { if !session.isReachable { self.verified = false; self.status = "iPhone is not reachable" } }
  }
}
struct WatchHome: View {
  @EnvironmentObject var connection: WatchConnection
  @Environment(\.scenePhase) var phase
  var body: some View {
    ScrollView {
      VStack(spacing: 12) {
        Image(systemName: connection.verified ? "checkmark.shield" : "applewatch.radiowaves.left.and.right").font(.largeTitle)
        Text("STAARWARDD").font(.caption).tracking(2)
        if !connection.companion.isEmpty { Text(connection.companion).font(.title3) }
        Text(connection.status).font(.footnote).multilineTextAlignment(.center)
        Button("Verify iPhone") { connection.verify() }.tint(.gray)
        Text("Connection companion. Voice and worlds run on iPhone.").font(.caption2).foregroundStyle(.secondary)
      }.padding()
    }.background(Color.black)
      .onChange(of: phase) { _, next in if next != .active { connection.verified = false } }
  }
}
