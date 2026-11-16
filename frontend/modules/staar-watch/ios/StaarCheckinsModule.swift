import CryptoKit
import ExpoModulesCore
import UserNotifications

// OS-scheduled check-ins work while JavaScript is suspended. They never run
// missions, record audio, infer arrival at home, or contain private account data.
public class StaarCheckinsModule: Module {
  private let scheduler = CheckinScheduler()
  public func definition() -> ModuleDefinition {
    Name("StaarCheckins")
    AsyncFunction("bindAccount") { (account: String) in
      await self.scheduler.bind(account)
    }
    AsyncFunction("status") { () -> [String: Any] in
      await self.scheduler.status()
    }
    AsyncFunction("schedule") { (account: String, hour: Int, minute: Int) -> [String: Any] in
      try await self.scheduler.schedule(account, hour: hour, minute: minute)
    }
    AsyncFunction("cancel") { () in await self.scheduler.cancel() }
  }
}

private actor CheckinScheduler {
  private let center = UNUserNotificationCenter.current()
  private let identifier = "staar.checkin.daily"
  private let ownerKey = "staar.checkin.owner.v1"
  private var revision = 0
  private var scheduling = false

  private func owner(_ account: String) -> String {
    account.isEmpty ? "" : SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
  }
  func bind(_ account: String) {
    let next = owner(account)
    if next.isEmpty || UserDefaults.standard.string(forKey: ownerKey) != next {
      revision += 1
      clear()
      UserDefaults.standard.set(next, forKey: ownerKey)
    }
  }
  private func clear() {
    center.removePendingNotificationRequests(withIdentifiers: [identifier])
    center.removeDeliveredNotifications(withIdentifiers: [identifier])
  }
  func cancel() { revision += 1; clear() }
  func status() async -> [String: Any] {
    let settings = await center.notificationSettings()
    let pending = await center.pendingNotificationRequests()
    let request = pending.first { $0.identifier == identifier }
    let trigger = request?.trigger as? UNCalendarNotificationTrigger
    let permissionsEnabled = settings.authorizationStatus == .authorized ||
      settings.authorizationStatus == .provisional || settings.authorizationStatus == .ephemeral
    return ["supported": true, "authorization": settings.authorizationStatus.rawValue,
      "notificationsEnabled": permissionsEnabled, "scheduled": request != nil, "hour": trigger?.dateComponents.hour ?? -1,
      "minute": trigger?.dateComponents.minute ?? -1, "timezone": "America/Toronto",
      "nextAt": trigger?.nextTriggerDate()?.timeIntervalSince1970 ?? 0]
  }
  func schedule(_ account: String, hour: Int, minute: Int) async throws -> [String: Any] {
    guard !account.isEmpty, (12...23).contains(hour), (0...59).contains(minute),
      UserDefaults.standard.string(forKey: ownerKey) == owner(account) else {
      throw NSError(domain: "StaarCheckins", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Sign in and choose a time from noon onward."])
    }
    guard !scheduling else {
      throw NSError(domain: "StaarCheckins", code: 2, userInfo: [NSLocalizedDescriptionKey: "A schedule update is already in progress."])
    }
    scheduling = true
    defer { scheduling = false }
    revision += 1
    let stamp = revision
    let granted = try await center.requestAuthorization(options: [.alert, .sound])
    guard stamp == revision else { throw CancellationError() }
    guard granted else { clear(); return await status() }
    var date = DateComponents()
    date.calendar = Calendar(identifier: .gregorian)
    date.timeZone = TimeZone(identifier: "America/Toronto")
    date.hour = hour; date.minute = minute
    let content = UNMutableNotificationContent()
    content.title = "STAARWARDD"
    content.body = "Your daily check-in is ready. Open STAAR Hub when you're ready."
    content.sound = .default
    let request = UNNotificationRequest(identifier: identifier, content: content,
      trigger: UNCalendarNotificationTrigger(dateMatching: date, repeats: true))
    try await center.add(request)
    // Cancellation/sign-out may interleave while the OS is registering it.
    guard stamp == revision else { clear(); throw CancellationError() }
    return await status()
  }
}
