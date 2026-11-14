import ExpoModulesCore
import WatchConnectivity

public class StaarWatchModule: Module {
  private let bridge = PhoneWatchBridge()
  public func definition() -> ModuleDefinition {
    Name("StaarWatch")
    AsyncFunction("status") { () -> [String: Any] in self.bridge.status() }
    AsyncFunction("share") { (enabled: Bool, companion: String) in
      try self.bridge.share(enabled: enabled, companion: companion)
    }
  }
}

final class PhoneWatchBridge: NSObject, WCSessionDelegate {
  private let queue = DispatchQueue(label: "staar.watch")
  private var verifiedAt: Double = 0
  private var enabled = false
  private var companion = "atlas"
  override init() {
    super.init()
    if WCSession.isSupported() { WCSession.default.delegate = self; WCSession.default.activate() }
  }
  func status() -> [String: Any] {
    guard WCSession.isSupported() else { return ["supported": false] }
    let s = WCSession.default
    return ["supported": true, "activated": s.activationState == .activated,
      "paired": s.isPaired, "installed": s.isWatchAppInstalled, "reachable": s.isReachable,
      "sharing": queue.sync { enabled }, "verifiedAt": queue.sync { verifiedAt }]
  }
  func share(enabled: Bool, companion: String) throws {
    guard ["atlas", "kaia", "guardian"].contains(companion) else { throw NSError(domain: "StaarWatch", code: 1) }
    queue.sync { self.enabled = enabled; self.companion = companion }
    try publish()
  }
  private func snapshot() -> [String: Any] {
    queue.sync { ["version": 1, "enabled": enabled, "companion": enabled ? companion : "", "sentAt": Date().timeIntervalSince1970] }
  }
  private func publish() throws {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    try WCSession.default.updateApplicationContext(snapshot())
  }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) { try? publish() }
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    guard message["version"] as? Int == 1, message["action"] as? String == "verify" else {
      replyHandler(["version": 1, "error": "unsupported_message"]); return
    }
    queue.sync { verifiedAt = Date().timeIntervalSince1970 }
    replyHandler(snapshot())
  }
}
